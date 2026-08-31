import { useState, useRef } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import CustomTextbox from "../../../Components/Minor-Components/CustomTextbox";
import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import RichTextEditor from "../../../Components/Minor-Components/RichTextEditor";

export default function Reimbursement() {
  const [category, setCategory] = useState("");
  const [cost, setCost] = useState(0);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const user = { name: "Kerbie Hector Abanid", email: "abanid1@gmail.com" };

  const handleFile = (f) => {
    setFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!category || !cost || !date || !description || !file) {
      alert("Please fill all required fields and attach a file.");
      return;
    }
    setSubmitting(true);
    // Replace with API call
    setTimeout(() => {
      console.log({ category, cost, date, description, file });
      setSubmitting(false);
      alert("Reimbursement submitted (demo)");
      setCategory("");
      setCost(0);
      setDate("");
      setDescription("");
      setDescriptionLength(0);
      setFile(null);
    }, 700);
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Records", path: "/warehouse-logistics/assigned-history" },
          { label: "Reimbursement" },
        ]}
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reimbursement Request</h1>
        <p className="text-sm text-slate-500 mt-1">Submit logistics and delivery reimbursement requests.</p>
      </div>

      <form onSubmit={onSubmit} className="mt-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Dropdown
                label={"Expense Category *"}
                options={[
                  { label: "Fuel", value: "fuel" },
                  { label: "Tolls", value: "tolls" },
                  { label: "Meals", value: "meals" },
                  { label: "Supplies", value: "supplies" },
                ]}
                value={category}
                onChange={(val) => setCategory(val)}
                placeholder="Select Category"
                className="mt-2"
              />
            </div>

            <div>
              <CustomTextbox
                label={"Requested By"}
                value={user.name}
                readOnly
                className="mt-2 bg-slate-100 text-slate-700"
              />
            </div>

            <div>
              <CustomTextbox
                label={"Cost (₱)"}
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="mt-2"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <CustomTextbox
                label={"Expense Date"}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-slate-700">Description <span className="text-rose-500">*</span></label>
            <RichTextEditor
              onChange={(html, text) => {
                setDescription(html);
                setDescriptionLength(text.length);
              }}
              placeholder="Provide detailed context for this expense ..."
              maxLength={1000}
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-slate-700">Attachment <span className="text-rose-500">*</span></label>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="mt-2 rounded-md border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center"
            >
              {file ? (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-700">{file.name}</div>
                  <button type="button" onClick={() => setFile(null)} className="text-sm text-rose-600">Remove</button>
                </div>
                  ) : (
                <div>
                  <p className="text-sm text-slate-500">Drag and drop files here or click to select</p>
                  <div className="mt-3">
                    <CustomGreenButton
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      text={"Upload"}
                      className="rounded-lg px-4 py-1.5"
                    />
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
                accept="image/png,image/jpg,image/jpeg,application/pdf,image/webp"
              />
            </div>

            <div className="text-xs text-slate-400 mt-2">Accepted: PNG, JPG, JPEG, WEBP, PDF. Max: 10MB.</div>
          </div>

          <div className="mt-6">
            <CustomGreenButton
              type="submit"
              text={submitting ? "Submitting..." : "Submit Reimbursement"}
              className={`w-full rounded-lg px-4 py-3 text-sm font-semibold ${submitting ? "opacity-80" : ""}`}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
