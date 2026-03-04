"""
Acad AgentOS entry point.

Exposes all agents, teams, and workflows via AgentOS REST API.

Endpoints (auto-generated):
  POST /agents/acad-agent/runs               -- primary chat (supports continue_run)
  POST /agents/acad-agent/runs/{id}/continue  -- resume after external tool execution
  POST /agents/writer-agent/runs             -- direct access to writer
  POST /agents/reviewer-agent/runs           -- direct access to reviewer
  POST /agents/abnt-agent/runs               -- direct access to ABNT agent
  POST /agents/references-agent/runs         -- direct access to references agent
  POST /teams/acad-team/runs                 -- multi-agent collaboration
  POST /workflows/write-chapter/runs         -- chapter writing pipeline
  POST /workflows/full-review/runs           -- document review pipeline
  POST /workflows/references-management/runs -- reference management pipeline

Run:
  python -m acad.main
  # or: uvicorn acad.main:app --port 7777 --reload
"""

from agno.os import AgentOS
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from acad.agents.abnt import abnt_agent
from acad.agents.base import _AGENT_REGISTRY, db, update_agent_model
from acad.agents.leader import acad_agent, acad_team
from acad.agents.references import references_agent
from acad.agents.reviewer import reviewer_agent
from acad.agents.writer import writer_agent
from acad.config import AGNO_HOST, AGNO_PORT
from acad.knowledge.abnt import abnt_knowledge
from acad.knowledge.templates import templates_knowledge
from acad.workflows.chapter import write_chapter_workflow
from acad.workflows.references import references_workflow
from acad.workflows.review import full_review_workflow

agent_os = AgentOS(
    id="acad-os",
    name="Acad AgentOS",
    description="Academic writing multi-agent system with ABNT standards support",
    agents=[
        acad_agent,
        writer_agent,
        reviewer_agent,
        abnt_agent,
        references_agent,
    ],
    teams=[acad_team],
    workflows=[
        write_chapter_workflow,
        full_review_workflow,
        references_workflow,
    ],
    knowledge=[abnt_knowledge, templates_knowledge],
    db=db,
    cors_allowed_origins=["*"],
)

app = agent_os.get_app()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Custom API endpoints for per-agent model management ----

class AgentModelUpdateRequest(BaseModel):
    provider: str
    modelId: str


@app.post("/api/agents/{agent_id}/model")
async def set_agent_model(agent_id: str, request: Request) -> JSONResponse:
    """Hot-swap the model on a running agent."""
    body = await request.json()
    provider = body.get("provider", "")
    model_id = body.get("modelId", "")

    if not provider or not model_id:
        return JSONResponse({"error": "provider and modelId are required"}, status_code=400)

    ok = update_agent_model(agent_id, provider, model_id)
    if not ok:
        return JSONResponse({"error": f"Agent '{agent_id}' not found"}, status_code=404)

    return JSONResponse({"status": "ok", "agent_id": agent_id, "provider": provider, "model_id": model_id})


@app.get("/api/agents")
async def list_agents() -> JSONResponse:
    """List all registered agents with their current model info."""
    agents = []
    for agent_id, agent in _AGENT_REGISTRY.items():
        model = getattr(agent, "model", None)
        model_info = {
            "id": agent_id,
            "name": getattr(agent, "name", agent_id),
            "role": getattr(agent, "role", ""),
            "model": {
                "provider": type(model).__name__ if model else "unknown",
                "modelId": getattr(model, "id", "unknown") if model else "unknown",
            } if model else None,
        }
        agents.append(model_info)
    return JSONResponse({"agents": agents})


if __name__ == "__main__":
    agent_os.serve(app="acad.main:app", port=AGNO_PORT, host=AGNO_HOST, reload=True)
