import { useState, useRef } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import CustomTextbox from "../../../Components/Minor-Components/CustomTextbox";
import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import RichTextEditor from "../../../Components/Minor-Components/RichTextEditor";
import { UploadCloud } from "lucide-react";

const user = { name: "Kerbie Hector Abanid", id: "EMP-10613" };

export default function DriverReimbursement() {
  const [category,    setCategory]    = useState("");
  const [cost,        setCost]        = useState("");
  const [date,        setDate]        = useState("2026/03/22");
  const [description, setDescription] = useState("");
  const [file,        setFile]        = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const fileRef = useRef(null);

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) setFile(f);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!category || !cost || !date || !description || !file) {
      alert("Please fill all required fields and attach a file.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      alert("Reimbursement submitted (demo)");
      setCategory(""); setCost(""); setDate(""); setDescription(""); setFile(null);
    }, 700);
  };

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: "Finance" }, { label: "Reimbursement" }]} />
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reimbursement Request</h1>
        <p className="text-sm text-slate-500 mt-1">Submit driver and delivery reimbursement requests.</p>
      </div>

      <form onSubmit={onSubmit}>
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Dropdown
                label="Expense Category *"
                options={[
                  { label: "Fuel",              value: "fuel" },
                  { label: "Tolls",             value: "tolls" },
                  { label: "Meals",             value: "meals" },
                  { label: "Vehicle Repair",    value: "vehicle_repair" },
                  { label: "Warehouse Operations", value: "warehouse_ops" },
                  { label: "Supplies",          value: "supplies" },
                ]}
                value={category}
                onChange={setCategory}
                placeholder="Select Category"
              />
            </div>
            <div>
              <CustomTextbox
                label="Requested By"
                value={user.name}
                readOnly
                className="bg-slate-100 text-slate-600"
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <CustomTextbox
                label="Cost (₱)"
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <CustomTextbox
                label="Expense Date *"
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="yyyy/mm/dd"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Description <span className="text-rose-500">*</span>
            </label>
            <RichTextEditor
              onChange={(html) => setDescription(html)}
              placeholder="Provide detailed context for this expense ..."
              maxLength={1000}
            />
          </div>

          {/* Attachment */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Attachment <span className="text-rose-500">*</span>
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center cursor-pointer hover:border-emerald-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-between px-4">
                  <span className="text-sm text-slate-700 font-medium">{file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                    <UploadCloud size={22} className="text-emerald-600" />
                  </div>
                  <p className="text-sm text-slate-500">Drag and Drop files here or click to select</p>
                  <button
                    type="button"
                    className="rounded-lg bg-[#0B5D1E] hover:bg-[#094d19] text-white text-xs font-bold px-5 py-2 transition-colors cursor-pointer"
                  >
                    Upload
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/png,image/jpg,image/jpeg,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0])}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Accepted: PNG, JPG, JPEG, WEBP, PDF. Max: 10MB.
            </p>
          </div>
        </div>

        {/* Submit bar */}
        <div className="mt-4">
          <CustomGreenButton
            type="submit"
            text={submitting ? "Submitting..." : "Submit Reimbursement"}
            className={`w-full rounded-xl py-3.5 text-sm font-bold ${submitting ? "opacity-70" : ""}`}
          />
        </div>
      </form>
    </div>
  );
}
