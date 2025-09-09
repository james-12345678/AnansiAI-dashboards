import React from "react";

type LessonJson = Record<string, any>;

export function prepareLessonContent(raw: any): string | LessonJson | null {
  if (raw === null || raw === undefined) return null;

  // If it's a string, try to detect JSON and parse it
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        // Not valid JSON, return the raw string
        return trimmed;
      }
    }
    return trimmed;
  }

  // If it's an object, try common shapes (textContent, content, blocks, ops)
  if (typeof raw === "object") {
    // Common shape: { textContent: "..." }
    if (typeof raw.textContent === "string") return raw.textContent;

    // Nested content: { content: "..." } or { content: { textContent: '...' } }
    if (raw.content && typeof raw.content === "string") return prepareLessonContent(raw.content);
    if (raw.content && typeof raw.content === "object") {
      if (typeof raw.content.textContent === "string") return raw.content.textContent;
      // If content is an object that resembles the lesson JSON, return it directly
      return raw.content;
    }

    // Rich text shapes: blocks (array) or ops (quill)
    if (Array.isArray(raw.blocks)) {
      return raw.blocks.map((b: any) => b.text || b.content || b).filter(Boolean);
    }

    if (Array.isArray(raw.ops)) {
      return raw.ops.map((op: any) => (typeof op.insert === "string" ? op.insert : "")).join("");
    }

    // Default: return the object as-is so renderLessonContent can inspect it
    return raw;
  }

  // Fallback to string
  return String(raw);
}

function renderArray(arr: any[]) {
  return (
    <ul className="list-disc pl-6">
      {arr.map((item, idx) => (
        <li key={idx} className="mb-1">
          {typeof item === "string" ? item : renderObject(item)}
        </li>
      ))}
    </ul>
  );
}

function renderObject(obj: LessonJson) {
  // If this object looks like a key-concept item
  if (obj && typeof obj === "object" && (obj.concept || obj.title || obj.name) && (obj.detailedExplanation || obj.description || obj.summary)) {
    const concept = obj.concept || obj.title || obj.name;
    const detailedExplanation = obj.detailedExplanation || obj.description || obj.summary || "";
    return (
      <div className="mb-4">
        <h4 className="text-md font-semibold">{concept}</h4>
        <p className="text-sm text-gray-700 mt-1">{detailedExplanation}</p>
        {obj.realLifeConnections && (
          <p className="text-sm text-gray-600 italic mt-1">{obj.realLifeConnections}</p>
        )}
      </div>
    );
  }

  // Generic object: render keys
  return (
    <div className="mb-3">
      {Object.keys(obj).map((k) => (
        <div key={k} className="mb-2">
          <h5 className="font-medium text-sm capitalize">{k.replace(/([A-Z])/g, " $1")}</h5>
          <div className="text-sm text-gray-700 mt-1">
            {Array.isArray(obj[k])
              ? renderArray(obj[k])
              : typeof obj[k] === "object"
              ? renderObject(obj[k])
              : String(obj[k])}
          </div>
        </div>
      ))}
    </div>
  );
}

function normalizeLessonObject(input: LessonJson): LessonJson {
  if (!input || typeof input !== "object") return input;
  const obj: LessonJson = { ...input };

  // Normalize title
  if (!obj.lessonTitle && (obj.title || obj.name)) {
    obj.lessonTitle = obj.lessonTitle || obj.title || obj.name;
  }

  // Normalize introduction/overview/summary
  obj.introduction = obj.introduction || obj.intro || null;
  obj.lessonOverview = obj.lessonOverview || obj.lesson_overview || obj.overview || null;
  obj.summary = obj.summary || obj.conclusion || obj.description || obj.lessonOverview || null;

  // Normalize learning objectives
  if (!obj.learningObjectives) {
    obj.learningObjectives = obj.learningObjectives || obj.objectives || obj.goals || null;
  }

  // Normalize key concepts
  if (!obj.keyConcepts) {
    obj.keyConcepts = obj.keyConcepts || obj.concepts || obj.coreConcepts || null;
  }

  // Normalize suggested activities
  obj.suggestedActivities = obj.suggestedActivities || obj.activities || obj.tasks || null;

  // Normalize further reading
  obj.furtherReading = obj.furtherReading || obj.further_reading || obj.references || obj.reading || null;

  // Ensure arrays are arrays of strings or objects
  if (obj.suggestedActivities && !Array.isArray(obj.suggestedActivities)) {
    obj.suggestedActivities = [String(obj.suggestedActivities)];
  }
  if (obj.furtherReading && !Array.isArray(obj.furtherReading)) {
    obj.furtherReading = [String(obj.furtherReading)];
  }

  // Normalize keyConcepts items into objects with concept + detailedExplanation
  if (Array.isArray(obj.keyConcepts)) {
    obj.keyConcepts = obj.keyConcepts.map((kc: any) => {
      if (typeof kc === "string") return { concept: kc, detailedExplanation: "" };
      if (typeof kc === "object") {
        return {
          concept: kc.concept || kc.title || kc.name || "",
          detailedExplanation: kc.detailedExplanation || kc.description || kc.summary || "",
          realLifeConnections: kc.realLifeConnections || kc.examples || kc.real_life || null,
        };
      }
      return { concept: String(kc), detailedExplanation: "" };
    });
  }

  return obj;
}

export function renderLessonContent(content: string | LessonJson | null | undefined) {
  if (!content) return <div className="text-gray-700">No content available.</div>;

  // If string, try parse JSON
  if (typeof content === "string") {
    const trimmed = content.trim();
    // If it looks like JSON (starts with { or [), try to parse
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return renderLessonContent(parsed);
      } catch (e) {
        // Not JSON, fall through to plain text rendering
      }
    }

    // Render plain text with paragraphs separated by double newlines, keep pre-line whitespace
    const paragraphs = trimmed.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    return (
      <div className="prose prose-sm text-gray-700">
        {paragraphs.map((p, idx) => (
          <p key={idx} className="whitespace-pre-line">
            {p}
          </p>
        ))}
      </div>
    );
  }

  // If array, render list
  if (Array.isArray(content)) {
    return renderArray(content as any[]);
  }

  // If object, normalize then render known fields in a readable order
  const obj = normalizeLessonObject(content as LessonJson);

  return (
    <div className="space-y-4 text-gray-800">
      {obj.lessonTitle && <h2 className="text-2xl font-bold">{obj.lessonTitle}</h2>}

      {obj.prerequisites && (
        <div>
          <h3 className="text-lg font-semibold">Prerequisites</h3>
          {renderArray(obj.prerequisites)}
        </div>
      )}

      {obj.introduction && (
        <div>
          <h3 className="text-lg font-semibold">Introduction</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">{obj.introduction}</p>
        </div>
      )}

      {obj.lessonOverview && (
        <div>
          <h3 className="text-lg font-semibold">Lesson Overview</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">{obj.lessonOverview}</p>
        </div>
      )}

      {obj.learningObjectives && (
        <div>
          <h3 className="text-lg font-semibold">Learning Objectives</h3>
          {renderArray(obj.learningObjectives)}
        </div>
      )}

      {obj.keyConcepts && (
        <div>
          <h3 className="text-lg font-semibold">Key Concepts</h3>
          <div className="mt-2 space-y-3">
            {obj.keyConcepts.map((kc: any, idx: number) => (
              <div key={idx} className="p-3 bg-white border rounded">
                {renderObject(kc)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {obj.summary && (
        <div>
          <h3 className="text-lg font-semibold">Summary</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">{obj.summary}</p>
        </div>
      )}

      {/* Suggested Activities */}
      {obj.suggestedActivities && (
        <div>
          <h3 className="text-lg font-semibold">Suggested Activities</h3>
          <div className="mt-2">
            {Array.isArray(obj.suggestedActivities) ? (
              <ul className="list-disc pl-6">
                {obj.suggestedActivities.map((a: any, i: number) => (
                  <li key={i} className="mb-1">{typeof a === "string" ? a : String(a)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-700">{String(obj.suggestedActivities)}</p>
            )}
          </div>
        </div>
      )}

      {/* Further Reading */}
      {obj.furtherReading && (
        <div>
          <h3 className="text-lg font-semibold">Further Reading</h3>
          <div className="mt-2">
            {Array.isArray(obj.furtherReading) ? (
              <ul className="list-disc pl-6">
                {obj.furtherReading.map((r: any, i: number) => (
                  <li key={i} className="mb-1">{typeof r === "string" ? r : String(r)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-700">{String(obj.furtherReading)}</p>
            )}
          </div>
        </div>
      )}

      {/* Render other known sections generically */}
      {obj.examples && (
        <div>
          <h3 className="text-lg font-semibold">Examples</h3>
          {renderArray(obj.examples)}
        </div>
      )}

      {obj.assessment && (
        <div>
          <h3 className="text-lg font-semibold">Assessment</h3>
          {obj.assessment.formative && (
            <div>
              <h4 className="font-medium">Formative</h4>
              <div className="mt-2 space-y-2">
                {obj.assessment.formative.map((f: any, idx: number) => (
                  <div key={idx} className="p-2 border rounded">
                    <div className="font-medium">{f.question}</div>
                    <div className="text-sm text-gray-700">Answer: {f.answerKey}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {obj.assessment.summative && (
            <div>
              <h4 className="font-medium">Summative</h4>
              <div className="mt-2 space-y-2">
                {obj.assessment.summative.map((s: any, idx: number) => (
                  <div key={idx} className="p-2 border rounded">
                    <div className="font-medium">{s.question}</div>
                    <div className="text-sm text-gray-700">Answer: {s.answerKey}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Render any remaining keys generically */}
      {Object.keys(obj)
        .filter(
          (k) =>
            ![
              "lessonTitle",
              "prerequisites",
              "introduction",
              "lessonOverview",
              "learningObjectives",
              "keyConcepts",
              "contentOrder",
              "examples",
              "assessment",
              "summary",
              "keyTakeaways",
              "suggestedActivities",
              "furtherReading",
            ].includes(k),
        )
        .map((k) => (
          <div key={k}>
            <h4 className="font-medium text-sm capitalize">{k.replace(/([A-Z])/g, " $1")}</h4>
            <div className="text-sm text-gray-700 mt-1">
              {Array.isArray(obj[k]) ? renderArray(obj[k]) : typeof obj[k] === "object" ? renderObject(obj[k]) : String(obj[k])}
            </div>
          </div>
        ))}
    </div>
  );
}
