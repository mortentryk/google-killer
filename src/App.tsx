import React, { useMemo, useState, useCallback } from "react";
import "./styles.css";

/** Types **/
interface Node {
  id: string;
  label: string;
  parentId?: string | null;
  x: number;
  y: number;
}
interface Edge {
  from: string;
  to: string;
}
interface LinkItem {
  title: string;
  url: string;
}
interface CommentItem {
  user: string;
  text: string;
}
interface VideoItem {
  title: string;
  url: string;
}
interface NodeContent {
  links: LinkItem[];
  comments: CommentItem[];
  videos: VideoItem[];
  ai: string; // placeholder
}

/** Initial graph from query (unchanged) **/
function buildGraphFromQuery(query: string): { nodes: Node[]; edges: Edge[] } {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      nodes: [{ id: "root", label: "Try searching…", x: 0, y: 0 }],
      edges: [],
    };
  }

  const taxo: Record<string, { path: string[]; branches: string[] }> = {
    "dog food": {
      path: ["Pets", "Dogs", "Food"],
      branches: ["Dry", "Wet", "Raw", "Grain-free", "Puppy", "Senior"],
    },
    "cat litter": {
      path: ["Pets", "Cats", "Litter"],
      branches: ["Clumping", "Silica", "Corn-based"],
    },
    "best laptop": {
      path: ["Tech", "Laptops", "Buying"],
      branches: ["Windows", "Mac", "Gaming"],
    },
  };

  let entry: { path: string[]; branches: string[] } | undefined = undefined;
  for (const key in taxo) {
    if (q.includes(key)) {
      entry = taxo[key];
      break;
    }
  }

  const path = entry?.path ?? [capitalizeWords(q)];
  const branches = entry?.branches ?? ["Overview", "Links", "Pros & Cons"];

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const xStep = 180;

  let parentId: string | null = null;
  path.forEach((label, i) => {
    const id = `path_${i}_${label}`;
    const x = i * xStep;
    const y = 0;
    nodes.push({ id, label, parentId, x, y });
    if (parentId) edges.push({ from: parentId, to: id });
    parentId = id;
  });

  const last = nodes[nodes.length - 1];
  const R = 160;
  const angleStep = (Math.PI * 2) / Math.max(1, branches.length);
  branches.forEach((b, idx) => {
    const angle = -Math.PI / 2 + idx * angleStep;
    const x = last.x + R * Math.cos(angle);
    const y = last.y + R * Math.sin(angle);
    const id = `br_${idx}_${b}`;
    nodes.push({ id, label: b, parentId: last.id, x, y });
    edges.push({ from: last.id, to: id });
  });

  return { nodes, edges };
}

function capitalizeWords(s: string) {
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}

/** Mock → initial content factory (used to seed a node on first open) **/
function makeInitialContent(label: string): NodeContent {
  return {
    links: [
      { title: "Example Guide", url: "https://example.com/guide" },
      { title: "Community Thread", url: "https://example.com/forum" },
    ],
    ai: `AI summary for “${label}”: Placeholder text here…`,
    comments: [
      { user: "Ava", text: `I like the “${label}” option.` },
      { user: "Ben", text: "Beware of marketing claims." },
    ],
    videos: [
      { title: "YouTube: Deep Dive", url: "https://youtu.be/dQw4w9WgXcQ" },
    ],
  };
}

export default function App() {
  const [query, setQuery] = useState("dog food");

  // Base graph from query
  const baseGraph = useMemo(() => buildGraphFromQuery(query), [query]);

  // User-created nodes/edges layered on top
  const [userNodes, setUserNodes] = useState<Node[]>([]);
  const [userEdges, setUserEdges] = useState<Edge[]>([]);

  // Node content store (per node id)
  const [contentByNode, setContentByNode] = useState<
    Record<string, NodeContent>
  >({});

  // Selection + UI state
  const [selected, setSelected] = useState<Node | null>(null);
  const [activeTab, setActiveTab] = useState<
    "Links" | "AI" | "Comments" | "Video" | "Edit"
  >("Links");

  // Combined graph for rendering & lookups
  const nodes = useMemo(
    () => [...baseGraph.nodes, ...userNodes],
    [baseGraph.nodes, userNodes]
  );
  const edges = useMemo(
    () => [...baseGraph.edges, ...userEdges],
    [baseGraph.edges, userEdges]
  );

  // Helpers
  const findNode = useCallback(
    (id: string) => nodes.find((n) => n.id === id),
    [nodes]
  );
  const childrenOf = useCallback(
    (pid: string) =>
      edges
        .filter((e) => e.from === pid)
        .map((e) => findNode(e.to)!)
        .filter(Boolean),
    [edges, findNode]
  );

  // Keep content seeded when opening a node
  const ensureContent = useCallback((node: Node) => {
    setContentByNode((prev) => {
      if (prev[node.id]) return prev;
      return { ...prev, [node.id]: makeInitialContent(node.label) };
    });
  }, []);

  // Positioning for new child nodes
  const computeChildPosition = (
    parent: Node,
    existingChildrenCount: number
  ): { x: number; y: number } => {
    const R = 150;
    const idx = existingChildrenCount; // place next around the circle
    const total = Math.max(existingChildrenCount + 1, 6); // spread nicely
    const angleStep = (Math.PI * 2) / total;
    const angle = -Math.PI / 2 + idx * angleStep;
    return {
      x: parent.x + R * Math.cos(angle),
      y: parent.y + R * Math.sin(angle),
    };
    // (Optional) You can make radius grow with count for large clusters.
  };

  // Actions
  const addChildNode = (parent: Node, label: string) => {
    const existingKids = childrenOf(parent.id).length;
    const { x, y } = computeChildPosition(parent, existingKids);
    const id = `user_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    const newNode: Node = {
      id,
      label: label.trim() || "New",
      parentId: parent.id,
      x,
      y,
    };
    const newEdge: Edge = { from: parent.id, to: id };
    setUserNodes((prev) => [...prev, newNode]);
    setUserEdges((prev) => [...prev, newEdge]);
    // Prepare content
    setContentByNode((prev) => ({
      ...prev,
      [id]: makeInitialContent(label || "New"),
    }));
  };

  const renameNode = (node: Node, newLabel: string) => {
    // Rename only if it's a user node (base nodes remain as-is for now)
    setUserNodes((prev) =>
      prev.map((n) => (n.id === node.id ? { ...n, label: newLabel } : n))
    );
    // Also update content AI summary label (optional)
    setContentByNode((prev) => {
      const c = prev[node.id];
      if (!c) return prev;
      return {
        ...prev,
        [node.id]: {
          ...c,
          ai: `AI summary for “${newLabel}”: Placeholder text here…`,
        },
      };
    });
  };

  const upsertContent = (nodeId: string, partial: Partial<NodeContent>) => {
    setContentByNode((prev) => {
      const existing = prev[nodeId] ?? {
        links: [],
        comments: [],
        videos: [],
        ai: "",
      };
      return { ...prev, [nodeId]: { ...existing, ...partial } };
    });
  };

  const onNodeClick = (n: Node) => {
    setSelected(n);
    setActiveTab("Links");
    ensureContent(n);
  };

  return (
    <div className="app">
      <header>
        <h1>Mind-Map Search</h1>
        <input
          placeholder="Search…"
          value={query}
          onChange={(e) => {
            setSelected(null);
            setUserNodes([]); // reset user augmentations when a new search happens
            setUserEdges([]);
            setQuery(e.target.value);
          }}
        />
      </header>

      <svg width="100%" height="620" className="canvas">
        {edges.map((e, idx) => {
          const a = findNode(e.from)!;
          const b = findNode(e.to)!;
          return (
            <line
              key={idx}
              x1={a.x + 300}
              y1={a.y + 300}
              x2={b.x + 300}
              y2={b.y + 300}
              stroke="#999"
            />
          );
        })}

        {nodes.map((n) => (
          <g
            key={n.id}
            transform={`translate(${n.x + 300},${n.y + 300})`}
            onClick={() => onNodeClick(n)}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={-70}
              y={-22}
              width={140}
              height={44}
              rx={10}
              className="node"
            />
            <text textAnchor="middle" dy="5" className="nodeText">
              {n.label}
            </text>
          </g>
        ))}
      </svg>

      {selected && (
        <Modal onClose={() => setSelected(null)} title={selected.label}>
          <div className="tabs">
            {(["Links", "AI", "Comments", "Video", "Edit"] as const).map(
              (t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={activeTab === t ? "active" : ""}
                >
                  {t}
                </button>
              )
            )}
          </div>

          <div className="tab-body">
            {activeTab === "Links" && (
              <LinksTab
                nodeId={selected.id}
                content={contentByNode[selected.id]}
                onAdd={(item) =>
                  upsertContent(selected.id, {
                    links: [...(contentByNode[selected.id]?.links || []), item],
                  })
                }
              />
            )}

            {activeTab === "AI" && (
              <p className="ai">{contentByNode[selected.id]?.ai ?? "…"}</p>
            )}

            {activeTab === "Comments" && (
              <CommentsTab
                nodeId={selected.id}
                content={contentByNode[selected.id]}
                onAdd={(c) =>
                  upsertContent(selected.id, {
                    comments: [
                      ...(contentByNode[selected.id]?.comments || []),
                      c,
                    ],
                  })
                }
              />
            )}

            {activeTab === "Video" && (
              <VideosTab
                nodeId={selected.id}
                content={contentByNode[selected.id]}
                onAdd={(v) =>
                  upsertContent(selected.id, {
                    videos: [...(contentByNode[selected.id]?.videos || []), v],
                  })
                }
              />
            )}

            {activeTab === "Edit" && (
              <EditTab
                node={selected}
                getChildrenCount={() => childrenOf(selected.id).length}
                onRename={(newLabel) => renameNode(selected, newLabel)}
                onAddChild={(label) => addChildNode(selected, label)}
              />
            )}
          </div>

          <button className="closeBtn" onClick={() => setSelected(null)}>
            Close
          </button>
        </Modal>
      )}
    </div>
  );
}

/** Tabs **/

function LinksTab({
  nodeId,
  content,
  onAdd,
}: {
  nodeId: string;
  content?: NodeContent;
  onAdd: (item: LinkItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const links = content?.links || [];
  return (
    <>
      <ul className="list">
        {links.map((l, i) => (
          <li key={i}>
            <a href={l.url} target="_blank" rel="noreferrer">
              {l.title}
            </a>
          </li>
        ))}
      </ul>
      <div className="formRow">
        <input
          placeholder="Link title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          onClick={() => {
            if (!title.trim() || !isHttpUrl(url)) return;
            onAdd({ title: title.trim(), url: url.trim() });
            setTitle("");
            setUrl("");
          }}
        >
          Add Link
        </button>
      </div>
    </>
  );
}

function CommentsTab({
  nodeId,
  content,
  onAdd,
}: {
  nodeId: string;
  content?: NodeContent;
  onAdd: (item: CommentItem) => void;
}) {
  const [user, setUser] = useState("");
  const [text, setText] = useState("");
  const comments = content?.comments || [];
  return (
    <>
      <ul className="list">
        {comments.map((c, i) => (
          <li key={i}>
            <b>{c.user}</b>: {c.text}
          </li>
        ))}
      </ul>
      <div className="formRow">
        <input
          placeholder="Your name"
          value={user}
          onChange={(e) => setUser(e.target.value)}
        />
        <input
          placeholder="Your comment"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          onClick={() => {
            if (!user.trim() || !text.trim()) return;
            onAdd({ user: user.trim(), text: text.trim() });
            setUser("");
            setText("");
          }}
        >
          Add Comment
        </button>
      </div>
    </>
  );
}

function VideosTab({
  nodeId,
  content,
  onAdd,
}: {
  nodeId: string;
  content?: NodeContent;
  onAdd: (item: VideoItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const videos = content?.videos || [];
  return (
    <>
      <ul className="list">
        {videos.map((v, i) => (
          <li key={i}>
            <a href={v.url} target="_blank" rel="noreferrer">
              {v.title}
            </a>
          </li>
        ))}
      </ul>
      <div className="formRow">
        <input
          placeholder="Video title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          placeholder="https://youtu.be/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          onClick={() => {
            if (!title.trim() || !isHttpUrl(url)) return;
            onAdd({ title: title.trim(), url: url.trim() });
            setTitle("");
            setUrl("");
          }}
        >
          Add Video
        </button>
      </div>
    </>
  );
}

function EditTab({
  node,
  getChildrenCount,
  onRename,
  onAddChild,
}: {
  node: Node;
  getChildrenCount: () => number;
  onRename: (newLabel: string) => void;
  onAddChild: (label: string) => void;
}) {
  const [newLabel, setNewLabel] = useState(node.label);
  const [childLabel, setChildLabel] = useState("");
  const childrenCount = getChildrenCount();

  return (
    <div className="editPanel">
      <div className="formRow">
        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        <button onClick={() => newLabel.trim() && onRename(newLabel.trim())}>
          Rename Node
        </button>
      </div>

      <div className="hr" />

      <div className="formRow">
        <input
          placeholder="New child branch label"
          value={childLabel}
          onChange={(e) => setChildLabel(e.target.value)}
        />
        <button
          onClick={() => {
            if (!childLabel.trim()) return;
            onAddChild(childLabel.trim());
            setChildLabel("");
          }}
        >
          Add Child
        </button>
      </div>

      <p className="hint">
        This node currently has <b>{childrenCount}</b> children.
      </p>
      <p className="hint small">
        (Backend idea: store edits as revisions; show history and allow rollback
        just like Wikipedia.)
      </p>
    </div>
  );
}

/** UI primitives **/
function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="modal">
      <div className="modal-content">
        <h2>{title}</h2>
        {children}
        <button className="closeBtn footer" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

/** utils **/
function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s.trim());
}
