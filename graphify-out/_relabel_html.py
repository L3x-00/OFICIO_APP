"""Re-etiqueta las comunidades del grafo con nombres legibles derivados de los
ARCHIVOS reales (área/feature + archivo dominante) en vez de "Community N", y
regenera graph.html para que cualquiera entienda las conexiones."""
import json
import os
from collections import Counter, defaultdict
from pathlib import Path

from graphify.build import build_from_json
from graphify.export import to_html

OUT = Path("graphify-out")
raw = json.loads((OUT / "graph.json").read_text(encoding="utf-8"))
nodes = raw.get("nodes", [])
# NO filtramos el cliente Prisma generado: sus modelos (Provider.ts, User.ts,
# …) son los HUBS por donde los servicios se conectan. Quitarlos deja el
# grafo SIN aristas cruzadas. Se quedan, etiquetados con su nombre de modelo.

members = defaultdict(list)
for n in nodes:
    cid = n.get("community")
    if cid is None:
        continue
    members[int(cid)].append(n)


def area_of(src: str):
    """Área legible a partir del path: backend/<módulo>, app/<feature>, admin, web."""
    if not src:
        return None
    p = src.replace("\\", "/").split("/")
    if "backend" in p:
        i = p.index("backend")
        if i + 2 < len(p) and p[i + 1] == "src":
            return f"backend/{p[i + 2]}"
        return "backend"
    if "mobile" in p:
        if "features" in p:
            j = p.index("features")
            if j + 1 < len(p):
                return f"app/{p[j + 1]}"
        if "core" in p:
            return "app/core"
        if "shared" in p:
            return "app/shared"
        return "app"
    if "admin" in p:
        return "admin"
    if "web" in p:
        return "web"
    return p[0] if p else None


labels: dict[int, str] = {}
counts: dict[int, int] = {}
for cid, ms in members.items():
    srcs = [m["source_file"] for m in ms if m.get("source_file")]
    counts[cid] = len(set(srcs)) or len(ms)
    if not srcs:
        labels[cid] = f"Community {cid}"
        continue
    files = Counter(os.path.basename(s) for s in srcs)
    areas = Counter(a for s in srcs if (a := area_of(s)))
    top_file = files.most_common(1)[0][0]
    top_area = areas.most_common(1)[0][0] if areas else None
    nfiles = len(set(srcs))
    if nfiles == 1:
        labels[cid] = top_file
    elif top_area:
        labels[cid] = f"{top_area} · {top_file}"
    else:
        labels[cid] = top_file

(OUT / ".graphify_labels.json").write_text(
    json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False),
    encoding="utf-8",
)

G = build_from_json(raw, directed=bool(raw.get("directed", False)))
communities = {cid: [m["id"] for m in ms] for cid, ms in members.items()}
to_html(
    G,
    communities,
    str(OUT / "graph.html"),
    community_labels=labels,
    member_counts=counts,
    node_limit=5000,
)
print(f"OK detalle — {len(labels)} comunidades etiquetadas")

# ── Vista de ÁREAS (alto nivel — la más fácil de entender) ──
# Agrupa TODOS los nodos por su área/feature y deja que to_html colapse cada
# área en un nodo. Resultado: ~30 cajas (backend/auth, app/providers_list,
# admin, web…) y las flechas muestran cómo se conectan los módulos. Ideal para
# que cualquiera entienda la arquitectura de un vistazo.
area_members: dict[str, set] = defaultdict(set)
for n in nodes:
    a = area_of(n.get("source_file")) or "otros"
    area_members[a].add(n["id"])
area_list = sorted(area_members)
area_idx = {a: i for i, a in enumerate(area_list)}
area_communities = {area_idx[a]: list(ids) for a, ids in area_members.items()}
area_labels = {area_idx[a]: a for a in area_list}
area_counts = {area_idx[a]: len(ids) for a, ids in area_members.items()}
to_html(
    G,
    area_communities,
    str(OUT / "graph-overview.html"),
    community_labels=area_labels,
    member_counts=area_counts,
    node_limit=5000,
)
print(f"OK overview — {len(area_list)} áreas: {', '.join(area_list[:12])}…")
