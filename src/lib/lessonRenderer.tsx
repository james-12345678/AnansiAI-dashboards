import React from "react";

type LessonJson = Record<string, any>;

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
  if (obj && typeof obj === "object" && obj.concept && obj.detailedExplanation) {
    return (
      <div className="mb-4">
        <h4 className="text-md font-semibold">{obj.concept}</h4>
        <p className="text-sm text-gray-700 mt-1">{obj.detailedExplanation}</p>
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
    const paragraphs = trimmed.split(/\n\n+/).map((p) => p.trim());
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

  // If object, render known fields in a readable order
  const obj = content as LessonJson;
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
      {obj.contentOrder && (
        <div>
          <h3 className="text-lg font-semibold">Content Order</h3>
          <ol className="list-decimal pl-6">
            {obj.contentOrder.map((c: any, idx: number) => (
              <li key={idx} className="mb-1">{c}</li>
            ))}
          </ol>
        </div>
      )}
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

      {obj.summary && (
        <div>
          <h3 className="text-lg font-semibold">Summary</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">{obj.summary}</p>
        </div>
      )}

      {obj.keyTakeaways && (
        <div>
          <h3 className="text-lg font-semibold">Key Takeaways</h3>
          {renderArray(obj.keyTakeaways)}
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
            ].includes(k),
        )
        .map((k) => (
          <div key={k}>
            <h4 className="font-medium text-sm capitalize">{k.replace(/([A-Z])/g, " $1")}</h4>
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
