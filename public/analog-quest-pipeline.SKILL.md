---
name: analog-quest-pipeline
description: Contribute to Analog Quest by running the LaTeX extraction pipeline on your local machine. This is "Mode A" — you download arXiv LaTeX source, extract and normalize equations via SymPy, and submit the results. Requires Python + sympy + antlr4. For the abstract-reader mode that doesn't need local Python, see analog-quest.
argument-hint: [session_cookie]
---

# Analog Quest Pipeline Contributor (Mode A)

You are helping Analog Quest process papers by running the LaTeX extraction pipeline locally. Unlike Mode B (which reads abstracts and classifies equation structure by judgment), Mode A does the actual symbolic work: download the .tex source from arXiv, parse every equation, normalize each one into canonical SymPy form, hash the result, and submit it to the shared database.

This mode makes the project genuinely self-sustaining — every paper processed by a Mode A contributor is a paper the project didn't have to run on its own compute.

## Prerequisites

You need Python 3.9+ with these packages installed:

```
pip install sympy antlr4-python3-runtime==4.11.1 requests
```

You also need the user to have signed in at https://analog.quest/contribute with GitHub. All API calls are auth-gated.

If any of this is missing, tell the user what to install and stop. Don't silently fall back.

## The loop

### 1. Fetch a batch of papers to process

```
GET https://analog.quest/api/pipeline/next-batch?size=10
```

Returns up to 10 papers that have not yet been extracted:

```json
{
  "batch": [
    { "paper_id": 501, "arxiv_id": "2604.06081", "title": "...", "domain": "cs" },
    { "paper_id": 502, "arxiv_id": "2604.06117", "title": "...", "domain": "math" }
  ],
  "size": 2
}
```

If the response is `{ "done": true }`, there is nothing to process — thank the user and stop.

Rate limit: 10 batch requests per minute per user. Don't loop faster than that.

### 2. For each paper, run the extraction locally

Use the Bash tool to run a Python extraction loop. Here is a minimal working example:

```python
import gzip, io, tarfile, urllib.request, re, hashlib, json, os

def fetch_latex(arxiv_id):
    """Download arXiv LaTeX source. Returns a list of .tex file contents."""
    url = f"https://export.arxiv.org/e-print/{arxiv_id}"
    req = urllib.request.Request(url, headers={
        'User-Agent': 'analog-quest-pipeline/1.0 (mode a contributor)'
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
    except Exception:
        return None

    # Try as tarball
    try:
        with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as tar:
            files = []
            for m in tar.getmembers():
                if m.name.endswith('.tex') and m.isfile():
                    f = tar.extractfile(m)
                    if f:
                        content = f.read()
                        try: files.append(content.decode('utf-8'))
                        except UnicodeDecodeError: files.append(content.decode('latin-1'))
            if files: return files
    except (tarfile.TarError, gzip.BadGzipFile):
        pass

    # Try as single gzipped .tex
    try:
        text = gzip.decompress(data).decode('utf-8', errors='replace')
        if r'\documentclass' in text or r'\begin{document}' in text:
            return [text]
    except Exception:
        pass

    return None


# Regex for display-math environments
DISPLAY_ENVS = ['equation', 'equation*', 'align', 'align*', 'gather', 'gather*',
                'multline', 'multline*', 'eqnarray', 'eqnarray*']
_env_re = re.compile(
    r'\\begin\{(' + '|'.join(re.escape(e) for e in DISPLAY_ENVS) + r')\}(.*?)\\end\{\1\}',
    re.DOTALL
)

def extract_equations(tex_files):
    """Extract equation environments from a list of .tex contents."""
    if not tex_files: return []
    out = []
    pos = 0
    for tex in tex_files:
        if r'\documentclass' not in tex and r'\begin{document}' not in tex:
            if not any(env in tex for env in [r'\begin{equation}', r'\begin{align}']):
                continue
        # strip comments
        tex = re.sub(r'(?<!\\)%.*$', '', tex, flags=re.MULTILINE)
        for m in _env_re.finditer(tex):
            env, content = m.group(1), m.group(2)
            content = re.sub(r'\\label\{[^}]*\}', '', content)
            content = re.sub(r'\s+', ' ', content).strip()
            content = content.replace('\x00', '')
            if len(content) < 4: continue
            # split align/gather on \\ line breaks
            if env not in ('equation', 'equation*'):
                for row in re.split(r'\\\\', content):
                    row = re.sub(r'&', ' ', row).strip()
                    if row and len(row) >= 4:
                        out.append({'latex': row, 'source_env': env, 'position': pos})
                        pos += 1
            else:
                out.append({'latex': content, 'source_env': env, 'position': pos})
                pos += 1
    return out


def normalize(latex):
    """SymPy-normalize one equation. Returns (success, normalized_form, hash, eq_type)."""
    from sympy.parsing.latex import parse_latex
    from sympy import Symbol, srepr

    # Classify roughly by operators present
    if re.search(r'\\partial|\\frac\{\\partial', latex): eq_type = 'pde'
    elif re.search(r'\\frac\{d|\\dot\{', latex): eq_type = 'ode'
    elif '=' in latex: eq_type = 'algebraic'
    else: eq_type = 'expression'

    try:
        # Split on = (not == or \neq)
        sides = re.split(r'(?<!\\)(?<!=)=(?!=)', latex)
        parsed = []
        for side in sides:
            side = side.strip()
            if not side: continue
            parsed.append(parse_latex(side))
        if not parsed:
            return (False, None, None, eq_type)

        # Collect symbols in tree-traversal order and rename canonically
        seen, seen_set = [], set()
        def walk(e):
            if isinstance(e, Symbol):
                if e not in seen_set:
                    seen.append(e); seen_set.add(e)
                return
            if hasattr(e, 'args'):
                for a in e.args: walk(a)
        for p in parsed: walk(p)
        mapping = {s: Symbol(f'x{i}') for i, s in enumerate(seen)}
        normalized = ' = '.join(srepr(p.subs(mapping)) for p in parsed)
        h = hashlib.sha256(normalized.encode()).hexdigest()
        return (True, normalized, h, eq_type)
    except Exception:
        return (False, None, None, eq_type)


def process_paper(paper_id, arxiv_id):
    """Extract one paper. Returns the payload ready to POST."""
    tex = fetch_latex(arxiv_id)
    if tex is None:
        return {'paper_id': paper_id, 'source_available': False}
    equations = []
    for eq in extract_equations(tex):
        success, norm, h, etype = normalize(eq['latex'])
        equations.append({
            'latex': eq['latex'][:4000],
            'source_env': eq['source_env'],
            'position': eq['position'],
            'sympy_parsed': success,
            'normalized_form': norm[:8000] if norm else None,
            'structure_hash': h,
            'equation_type': etype,
        })
    return {'paper_id': paper_id, 'source_available': True, 'equations': equations}
```

### 3. Submit the batch

```
POST https://analog.quest/api/pipeline/submit-extractions
Content-Type: application/json

{
  "papers": [
    { "paper_id": 501, "source_available": true, "equations": [...] },
    { "paper_id": 502, "source_available": true, "equations": [...] }
  ]
}
```

Limits:
- Max 25 papers per request
- Max 2000 equations per paper
- Each latex string <= 4000 chars
- Each normalized_form <= 8000 chars

The response tells you how many equations were inserted per paper. Because the schema has a UNIQUE index on (paper_id, position), re-submitting the same paper is safe — duplicates are silently skipped.

### 4. Rate limiting and etiquette

- arXiv asks for at least 3 seconds between fetches. Respect it or they'll block you.
- Mode A submit is rate-limited at 60 req/min per user — generous, but don't thrash it.
- A batch of 10 papers typically takes 2–5 minutes end-to-end. That's fine. Don't try to parallelize downloads.

### 5. Report back

After each batch, tell the user:
- How many papers you processed
- How many equations you extracted
- How many SymPy successfully parsed vs fell back to unparsed
- Whether the submit response indicates new structural hash matches

Then go back to step 1.

## Stop conditions

- `{ "done": true }` from next-batch — queue empty
- User tells you to stop
- Your context is getting tight (check at the end of each paper, not each equation)
- Any 401 response — session expired, ask the user to sign in again

## Why this matters

Every paper you process on your local machine is a paper the project didn't have to run on its own compute. At scale this is the only way Analog Quest can cover arXiv without burning a single person's budget. You're literally the reason the project works.

See the full source at https://github.com/chuckyatsuk/analog-quest — the Python in `scripts/pipeline/` is the reference implementation of everything above.
