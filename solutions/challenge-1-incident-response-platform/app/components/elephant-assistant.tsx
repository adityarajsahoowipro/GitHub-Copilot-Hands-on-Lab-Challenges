"use client";

import { FormEvent, useEffect, useState } from "react";
import { assistantApi, incidentApiEnabled } from "../lib/incident-api";

type AssistantIncident = {
  incidentId: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  owner: string;
  impactedService: string;
};

type Anchor = "incident" | "sla" | "timeline" | "rca" | "related";

type Props = {
  incident: AssistantIncident;
  slaLabel: string;
  relatedCount: number;
  timelineCount: number;
};
type Citation = { source: string; type: string; label: string };

const anchors: Array<{ id: Anchor; label: string }> = [
  { id: "incident", label: "Incident" },
  { id: "sla", label: "SLA" },
  { id: "timeline", label: "Timeline" },
  { id: "rca", label: "RCA" },
  { id: "related", label: "Related" },
];

function mockAnswer(question: string, incident: AssistantIncident, slaLabel: string, relatedCount: number, timelineCount: number) {
  const normalized = question.toLowerCase();
  if (normalized.includes("sla") || normalized.includes("risk") || normalized.includes("deadline")) {
    return `This is a ${incident.severity} incident affecting ${incident.impactedService}. Its current SLA state is ${slaLabel}. Keep ${incident.owner} as the response owner and record the next mitigation decision in the timeline.`;
  }
  if (normalized.includes("related") || normalized.includes("similar")) {
    return relatedCount ? `There are ${relatedCount} related incident candidate${relatedCount === 1 ? "" : "s"}. The strongest signal is a shared impacted service or incident language.` : "No strong related-incident candidates are visible for this incident.";
  }
  if (normalized.includes("timeline") || normalized.includes("response") || normalized.includes("happened")) {
    return `The response timeline contains ${timelineCount} recorded event${timelineCount === 1 ? "" : "s"}. ${incident.owner} currently owns the response, and the incident is ${incident.status}.`;
  }
  if (normalized.includes("rca") || normalized.includes("root cause") || normalized.includes("recommend")) {
    return `The RCA should focus on the ${incident.impactedService} failure described in the incident evidence. Start with the customer impact, document the mitigation, then add a prevention recommendation.`;
  }
  return `${incident.title} is a ${incident.severity} ${incident.status} incident affecting ${incident.impactedService}. ${incident.description} The current owner is ${incident.owner}.`;
}

export function ElephantAssistant({ incident, slaLabel, relatedCount, timelineCount }: Props) {
  const [anchor, setAnchor] = useState<Anchor>("incident");
  const [open, setOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);

  useEffect(() => {
    setAnswer("");
    setCitations([]);
    setOpen(false);
    setAnchor("incident");
  }, [incident.incidentId]);

  useEffect(() => {
    if (open) return;
    const timer = window.setInterval(() => {
      setAnchor((current) => anchors[(anchors.findIndex((item) => item.id === current) + 1) % anchors.length].id);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [open]);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;
    setThinking(true);
    try {
      if (incidentApiEnabled) {
        const response = await assistantApi.message({ incidentId: incident.incidentId, question });
        setAnswer(response.answer);
        setCitations(response.citations);
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 420));
        setAnswer(mockAnswer(question, incident, slaLabel, relatedCount, timelineCount));
        setCitations([
          { source: incident.incidentId, type: "incident", label: incident.title },
          { source: incident.incidentId, type: "service", label: incident.impactedService },
          { source: incident.incidentId, type: "lifecycle", label: incident.status },
        ]);
      }
    } catch {
      setAnswer("The live assistant is unavailable, so this local workspace cannot retrieve a model answer right now.");
      setCitations([]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className={`elephant-assistant anchor-${anchor} ${open ? "is-open" : ""}`}>
      <div className="elephant-anchor-strip" aria-label="Assistant context anchors">
        {anchors.map((item) => <button key={item.id} className={anchor === item.id ? "active" : ""} onClick={() => setAnchor(item.id)}>{item.label}</button>)}
      </div>
      {open && <div className="elephant-panel" role="dialog" aria-label="Incident assistant">
        <div className="elephant-panel-heading"><div><span className="eyebrow">FIELD COMPANION</span><strong>Ask about {incident.incidentId}</strong></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Close incident assistant">×</button></div>
        <p className="elephant-context">Read-only answers grounded in the current incident workspace.</p>
        {answer && <div className="elephant-answer"><p>{answer}</p>{citations.length > 0 && <div className="elephant-citations"><span>Evidence</span>{citations.map((citation) => <button key={`${citation.source}-${citation.type}`} onClick={() => setAnchor(citation.type === "service" ? "related" : citation.type === "lifecycle" ? "sla" : "incident")}>{citation.label}</button>)}</div>}</div>}
        <form className="elephant-form" onSubmit={ask}><input autoFocus aria-label="Ask incident assistant" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about impact, SLA, RCA..." /><button className="text-button" type="submit">{thinking ? "Thinking" : "Ask"}</button></form>
        <div className="elephant-prompts"><button onClick={() => setQuestion("What is happening with this incident?")}>What is happening?</button><button onClick={() => setQuestion("Why is the SLA at risk?")}>Why is SLA at risk?</button><button onClick={() => setQuestion("Summarize the RCA recommendations.")}>Summarize RCA</button></div>
      </div>}
      <button className="elephant-mascot" onClick={() => setOpen((current) => !current)} aria-label="Open incident assistant" aria-expanded={open} title="Open incident assistant"><span className="elephant-ear left" /><span className="elephant-ear right" /><span className="elephant-eye" /><span className="elephant-tusk" /><span className="elephant-trunk" /><span className="elephant-spark">✦</span></button>
      {!open && <button className="elephant-bubble" onClick={() => setOpen(true)}>{thinking ? "Thinking..." : answer ? "I found an answer" : `Ask about ${incident.incidentId}`}<span>↗</span></button>}
    </div>
  );
}
