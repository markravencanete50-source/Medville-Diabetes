import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { deleteFaq, loadFaqs, newId, saveFaq, type FaqRecord } from "../data";
import { Banner, Card, Empty, Field, PageHeader, Spinner, useToast } from "../ui";

/*
  Questions and answers.

  Order is stored as a number rather than implied by anything, so moving an
  item is one write and the site sorts by the same field. Saving happens per
  item rather than as one big form, so a slow connection cannot lose a whole
  page of edits.
*/

export default function Faqs() {
  const toast = useToast();
  const [items, setItems] = useState<FaqRecord[] | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setItems(await loadFaqs());
    } catch {
      setItems([]);
      setError("The questions could not be loaded. Check that Firestore is enabled.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = async () => {
    const record: FaqRecord = {
      id: newId(),
      question: "",
      answer: "",
      order: (items?.length ?? 0) + 1,
    };
    setItems((current) => [...(current ?? []), record]);
  };

  const save = async (record: FaqRecord) => {
    if (!record.question.trim() || !record.answer.trim()) {
      return toast("Please fill in both the question and the answer.", "danger");
    }
    try {
      await saveFaq(record);
      toast("Question saved.");
      await refresh();
    } catch {
      toast("That question could not be saved.", "danger");
    }
  };

  const remove = async (record: FaqRecord) => {
    if (!window.confirm("Remove this question from the website?")) return;
    try {
      await deleteFaq(record.id);
      toast("Question removed.");
      await refresh();
    } catch {
      toast("That question could not be removed.", "danger");
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!items) return;
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const renumbered = next.map((item, position) => ({ ...item, order: position + 1 }));
    setItems(renumbered);
    try {
      await Promise.all(renumbered.map(saveFaq));
    } catch {
      toast("The new order could not be saved.", "danger");
    }
  };

  return (
    <>
      <PageHeader
        title="Questions"
        lede="The questions and answers shown on the home page."
        actions={
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => void add()}>
            <Plus size={16} /> Add question
          </button>
        }
      />

      {error && (
        <div className="mb-4">
          <Banner tone="warn">{error}</Banner>
        </div>
      )}

      {items === null ? (
        <Card>
          <Spinner label="Loading questions" />
        </Card>
      ) : !items.length ? (
        <Card>
          <Empty>
            No questions saved yet. The website is showing the four it was built with until you add
            your own.
          </Empty>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <FaqRow
              key={item.id}
              record={item}
              first={index === 0}
              last={index === items.length - 1}
              onChange={(next) =>
                setItems((current) =>
                  (current ?? []).map((entry) => (entry.id === next.id ? next : entry)),
                )
              }
              onSave={() => void save(item)}
              onRemove={() => void remove(item)}
              onMove={(direction) => void move(index, direction)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function FaqRow({
  record,
  first,
  last,
  onChange,
  onSave,
  onRemove,
  onMove,
}: {
  record: FaqRecord;
  first: boolean;
  last: boolean;
  onChange: (next: FaqRecord) => void;
  onSave: () => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-3">
        <Field label="Question" htmlFor={`faq-q-${record.id}`}>
          <input
            id={`faq-q-${record.id}`}
            className="admin-input"
            value={record.question}
            maxLength={160}
            onChange={(event) => onChange({ ...record, question: event.target.value })}
          />
        </Field>
        <Field label="Answer" htmlFor={`faq-a-${record.id}`}>
          <textarea
            id={`faq-a-${record.id}`}
            className="admin-textarea"
            value={record.answer}
            maxLength={900}
            onChange={(event) => onChange({ ...record, answer: event.target.value })}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="admin-btn admin-btn-primary" onClick={onSave}>
            Save
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-quiet"
            disabled={first}
            onClick={() => onMove(-1)}
            aria-label="Move up"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-quiet"
            disabled={last}
            onClick={() => onMove(1)}
            aria-label="Move down"
          >
            <ChevronDown size={16} />
          </button>
          <button type="button" className="admin-btn admin-btn-danger ml-auto" onClick={onRemove}>
            <Trash2 size={15} /> Remove
          </button>
        </div>
      </div>
    </Card>
  );
}
