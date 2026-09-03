import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  deleteTestimonial,
  loadTestimonials,
  newId,
  saveTestimonial,
  type TestimonialRecord,
} from "../data";
import { Badge, Banner, Card, Empty, Field, PageHeader, Spinner, useToast } from "../ui";

/*
  Reviews.

  A review is published only when the client says so, and the draft state is
  the default. That matters here beyond ordinary editing hygiene: a review from
  a real customer of a diabetes supplier identifies that person as a patient,
  so it should never reach the website by accident, and the note below the
  form says so in plain terms.
*/

export default function Testimonials() {
  const toast = useToast();
  const [items, setItems] = useState<TestimonialRecord[] | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setItems(await loadTestimonials());
    } catch {
      setItems([]);
      setError("The reviews could not be loaded. Check that Firestore is enabled.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = () => {
    setItems((current) => [
      ...(current ?? []),
      {
        id: newId(),
        quote: "",
        name: "",
        location: "",
        order: (current?.length ?? 0) + 1,
        published: false,
      },
    ]);
  };

  const save = async (record: TestimonialRecord) => {
    if (!record.quote.trim()) return toast("Please write the review first.", "danger");
    try {
      await saveTestimonial(record);
      toast(record.published ? "Review saved and published." : "Review saved as a draft.");
      await refresh();
    } catch {
      toast("That review could not be saved.", "danger");
    }
  };

  const remove = async (record: TestimonialRecord) => {
    if (!window.confirm("Remove this review?")) return;
    try {
      await deleteTestimonial(record.id);
      toast("Review removed.");
      await refresh();
    } catch {
      toast("That review could not be removed.", "danger");
    }
  };

  return (
    <>
      <PageHeader
        title="Reviews"
        lede="What customers say. A review appears on the website only once you publish it."
        actions={
          <button type="button" className="admin-btn admin-btn-primary" onClick={add}>
            <Plus size={16} /> Add review
          </button>
        }
      />

      {error && (
        <div className="mb-4">
          <Banner tone="warn">{error}</Banner>
        </div>
      )}

      <div className="mb-4">
        <Banner tone="info">
          Ask the customer in writing before publishing a review with their name. A review on a
          diabetes supply website identifies that person as a patient.
        </Banner>
      </div>

      {items === null ? (
        <Card>
          <Spinner label="Loading reviews" />
        </Card>
      ) : !items.length ? (
        <Card>
          <Empty>No reviews yet.</Empty>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <Badge tone={item.published ? "ok" : "quiet"}>
                  {item.published ? "Published" : "Draft"}
                </Badge>
                <button
                  type="button"
                  className="admin-btn admin-btn-danger admin-btn-sm"
                  onClick={() => void remove(item)}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <Field label="What they said" htmlFor={`t-quote-${item.id}`}>
                  <textarea
                    id={`t-quote-${item.id}`}
                    className="admin-textarea"
                    maxLength={600}
                    value={item.quote}
                    onChange={(event) =>
                      setItems((current) =>
                        (current ?? []).map((entry) =>
                          entry.id === item.id ? { ...entry, quote: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name" htmlFor={`t-name-${item.id}`} help="A first name is enough.">
                    <input
                      id={`t-name-${item.id}`}
                      className="admin-input"
                      maxLength={80}
                      value={item.name}
                      onChange={(event) =>
                        setItems((current) =>
                          (current ?? []).map((entry) =>
                            entry.id === item.id ? { ...entry, name: event.target.value } : entry,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Location" htmlFor={`t-loc-${item.id}`}>
                    <input
                      id={`t-loc-${item.id}`}
                      className="admin-input"
                      maxLength={80}
                      value={item.location}
                      onChange={(event) =>
                        setItems((current) =>
                          (current ?? []).map((entry) =>
                            entry.id === item.id ? { ...entry, location: event.target.value } : entry,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>

                <label className="flex items-center gap-2.5 text-[14px] font-medium">
                  <input
                    type="checkbox"
                    checked={item.published}
                    onChange={(event) =>
                      setItems((current) =>
                        (current ?? []).map((entry) =>
                          entry.id === item.id
                            ? { ...entry, published: event.target.checked }
                            : entry,
                        ),
                      )
                    }
                  />
                  Show this review on the website
                </label>

                <button
                  type="button"
                  className="admin-btn admin-btn-primary self-start"
                  onClick={() => void save(item)}
                >
                  Save
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
