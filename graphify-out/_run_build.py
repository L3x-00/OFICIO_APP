import json
from pathlib import Path

from graphify.build import build
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json, to_html, _git_head

OUT = Path("graphify-out")

ast = json.loads((OUT / ".graphify_ast.json").read_text(encoding="utf-8"))
sem = json.loads((OUT / ".graphify_semantic.json").read_text(encoding="utf-8"))
detect = json.loads((OUT / ".graphify_detect.json").read_text(encoding="utf-8"))

extractions = [ast, sem]
cached = OUT / ".graphify_cached.json"
if cached.exists():
    extractions.append(json.loads(cached.read_text(encoding="utf-8")))

G = build(extractions, root=".")
print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

communities = cluster(G)
cohesion = score_all(G, communities)
gods = god_nodes(G, top_n=15)
surprises = surprising_connections(G, communities)
labels = {cid: f"Community {cid}" for cid in communities}
questions = suggest_questions(G, communities, labels)

tokens = {
    "input": int(ast.get("input_tokens", 0)) + int(sem.get("input_tokens", 0)),
    "output": int(ast.get("output_tokens", 0)) + int(sem.get("output_tokens", 0)),
}
commit = _git_head()

report = generate(
    G, communities, cohesion, labels, gods, surprises,
    detect, tokens, ".", suggested_questions=questions,
    min_community_size=3, built_at_commit=commit,
)
(OUT / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")
to_json(G, communities, str(OUT / "graph.json"), community_labels=labels, force=True)
(OUT / ".graphify_labels.json").write_text(
    json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False),
    encoding="utf-8",
)
try:
    to_html(G, communities, str(OUT / "graph.html"), community_labels=labels or None)
    print("HTML written")
except Exception as e:
    print(f"HTML skipped: {e}")

print(f"Done - {len(communities)} communities")
print("=== GOD NODES (top 15) ===")
for g in gods:
    print(json.dumps(g, ensure_ascii=False))
