import json
from pathlib import Path

from graphify.build import build_from_json
from graphify.export import to_html

OUT = Path("graphify-out")
raw = json.loads((OUT / "graph.json").read_text(encoding="utf-8"))
G = build_from_json(raw, directed=bool(raw.get("directed", False)))

# Reconstruir comunidades desde el atributo 'community' de cada nodo.
communities = {}
for n in raw.get("nodes", []):
    cid = n.get("community")
    if cid is None:
        continue
    communities.setdefault(int(cid), []).append(n["id"])

labels = {}
labels_path = OUT / ".graphify_labels.json"
if labels_path.exists():
    labels = {int(k): v for k, v in json.loads(labels_path.read_text(encoding="utf-8")).items()}

print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities")

# node_limit=5000 → vista de agregación por comunidad (cada comunidad = 1 nodo),
# usable en navegador para un grafo de 12k nodos.
to_html(
    G,
    communities,
    str(OUT / "graph.html"),
    community_labels=labels or None,
    node_limit=5000,
)
size = (OUT / "graph.html").stat().st_size
print(f"HTML OK -> graphify-out/graph.html ({size} bytes)")
