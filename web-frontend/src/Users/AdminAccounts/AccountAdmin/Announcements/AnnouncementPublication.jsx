import {
  useRef,
  useState,
} from "react";

import {
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Sparkles,
  X,
} from "lucide-react";

import TextEditor from "../../../../Components/Minor-Components/TextEditor";
import Toast from "../../../../Components/Minor-Components/Toast";

import ExistingDraftsModal from "../../../../Components/Modals/AdminModals/ExistingDraftsModal";
import ClimateForecastModal from "../../../../Components/Modals/AdminModals/ClimateForecastModal";
import ClearAnnouncementModal from "../../../../Components/Modals/AdminModals/ClearAnnouncementModal";
import SaveDraftModal from "../../../../Components/Modals/AdminModals/SaveDraftModal";
import PublishAnnouncementModal from "../../../../Components/Modals/AdminModals/PublishAnnouncementModal";

import useAnnouncementClimate from "../../../../Components/hooks/AccountAdmin/useAnnouncementClimate";
import useAnnouncementAdmin from "../../../../Components/hooks/AccountAdmin/useAnnouncementAdmin";
import useToast from "../../../../Components/hooks/useToast";


const INITIAL_FORM = {
  announcementId: null,
  title: "",
  audience: "",
  content: "",
  contentText: "",
  imageFile: null,
  imagePreview: "",
  existingImageUrl: "",
};


const AnnouncementPublication = () => {
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(INITIAL_FORM);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [showClimateModal, setShowClimateModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftsList, setDraftsList] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  const {
    forecast: climateForecast,
    loadingForecast,
    fetchClimateForecast,
    generatingArticle,
    generateClimateArticle,
  } = useAnnouncementClimate();

  const { saveAdminDraft, publishAdminAnnouncement, loadAdminDrafts } = useAnnouncementAdmin();
  const { toasts, showToast, removeToast } = useToast();

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleEditorChange = (html, text) => {
    setForm((current) => ({ ...current, content: html, contentText: text }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      event.target.value = "";
      return;
    }
    const preview = URL.createObjectURL(file);
    if (form.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(form.imagePreview);
    setForm((current) => ({
      ...current,
      imageFile: file,
      imagePreview: preview,
      existingImageUrl: "",
    }));
  };

  const removeImage = () => {
    if (form.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(form.imagePreview);
    setForm((current) => ({
      ...current,
      imageFile: null,
      imagePreview: "",
      existingImageUrl: "",
    }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUseDraft = (draft) => {
    if (!draft) return;
    setForm({
      announcementId: draft.announcement_id ?? null,
      title: draft.title ?? "",
      audience: draft.audience ?? "",
      content: draft.content ?? "",
      contentText: draft.content_text ?? "",
      imageFile: null,
      imagePreview: draft.image_url ?? "",
      existingImageUrl: draft.image_url ?? "",
    });
    setShowDraftsModal(false);
  };

  const handleOpenDrafts = async () => {
    setShowDraftsModal(true);
    setLoadingDrafts(true);
    try {
      const drafts = await loadAdminDrafts();
      setDraftsList(drafts);
    } catch (err) {
      showToast({
        type: "error",
        title: "Failed to Load Drafts",
        message: err?.message || "Unable to retrieve announcement drafts.",
      });
    } finally {
      setLoadingDrafts(false);
    }
  };

  const handleOpenClimate = () => setShowClimateModal(true);

  const handleConfirmLocation = async (location) => {
    try {
      await fetchClimateForecast(location);
    } catch (err) {
      showToast({
        type: "error",
        title: "Climate Retrieval Failed",
        message: err?.message || "Unable to retrieve climate forecast.",
      });
    }
  };

  const handleGenerateArticle = async ({ audience, range, forecast, location }) => {
    try {
      const generated = await generateClimateArticle({ audience, range, forecast, location });
      if (generated) {
        setForm((current) => ({
          ...current,
          title: generated.title || current.title,
          content: generated.content_html || generated.content || current.content,
          contentText: generated.content_text || generated.climate_summary || current.contentText,
          audience: audience || current.audience,
        }));
        setShowClimateModal(false);
        showToast({
          type: "success",
          title: "Article Generated",
          message: "Climate-informed article drafted successfully.",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "AI Generation Failed",
        message: err?.message || "Unable to generate climate article.",
      });
    }
  };

  const clearForm = () => {
    if (form.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(form.imagePreview);
    setForm(INITIAL_FORM);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowClearModal(false);
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      await saveAdminDraft({
        announcementId: form.announcementId,
        title: form.title,
        audience: form.audience,
        content: form.content,
        imageUrl: form.existingImageUrl || "",
      });
      setShowSaveDraftModal(false);
      showToast({
        type: "success",
        title: "Draft Saved",
        message: "The announcement was saved as a draft.",
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Save Failed",
        message: err?.message || "Unable to save announcement draft.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      setSaving(true);
      await publishAdminAnnouncement({
        announcementId: form.announcementId,
        title: form.title,
        audience: form.audience,
        content: form.content,
        imageUrl: form.existingImageUrl || "",
      });
      setShowPublishModal(false);
      clearForm();
      showToast({
        type: "success",
        title: "Announcement Published",
        message: "The announcement has been published successfully.",
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Publish Failed",
        message: err?.message || "Unable to publish announcement.",
      });
    } finally {
      setSaving(false);
    }
  };

  const hasFormContent = Boolean(
    form.title.trim() || form.audience || form.contentText.trim() || form.imageFile || form.existingImageUrl
  );

  const canPublish = Boolean(
    form.title.trim() && form.audience && form.contentText.trim()
  );

  return (
    <>
      {/* PAGE HEADER */}
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create Announcement</h1>
          <p className="mt-1 text-sm text-gray-500">
            Write an announcement manually or use the latest climate forecast to prepare an article draft.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            id="use-existing-draft-btn"
            onClick={handleOpenDrafts}
            className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
          >
            <FileText size={16} className="text-gray-500" />
            Use Existing Draft
          </button>

          <button
            type="button"
            id="climate-forecast-btn"
            onClick={handleOpenClimate}
            disabled={loadingForecast}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#005928] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#004720] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles size={16} />
            {loadingForecast ? "Getting Forecast..." : "Get Climate Forecast & Generate with AI"}
          </button>
        </div>
      </div>

      {/* ANNOUNCEMENT DETAILS */}
      <section className="mb-5 rounded-xl border border-gray-200/90 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <h2 className="text-sm font-bold text-gray-900">Announcement Details</h2>
        <p className="mt-0.5 text-xs text-gray-400">Set the title and intended audience for this announcement.</p>

        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="announcement-title" className="mb-1.5 block text-xs font-semibold text-gray-700">
              Announcement Title
            </label>
            <input
              id="announcement-title"
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              maxLength={255}
              placeholder="Enter announcement title"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#005928] focus:ring-1 focus:ring-[#005928]"
            />
          </div>

          <div>
            <label htmlFor="announcement-audience" className="mb-1.5 block text-xs font-semibold text-gray-700">
              Choose Audience
            </label>
            <div className="relative">
              <select
                id="announcement-audience"
                value={form.audience}
                onChange={(e) => updateField("audience", e.target.value)}
                className={`h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white px-3.5 pr-10 text-sm outline-none transition focus:border-[#005928] focus:ring-1 focus:ring-[#005928] ${
                  !form.audience ? "text-gray-400" : "text-gray-900"
                }`}
              >
                <option value="" disabled hidden>
                  Select audience
                </option>
                <option value="all" className="text-gray-900">All</option>
                <option value="miller" className="text-gray-900">Miller</option>
                <option value="warehouse" className="text-gray-900">Warehouse</option>
                <option value="retailer" className="text-gray-900">Retailer</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ARTICLE CONTENT */}
      <section className="mb-5 rounded-xl border border-gray-200/90 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Article Content</h2>
            <p className="mt-0.5 text-xs text-gray-400">Write or edit the announcement content below.</p>
          </div>
          {generatingArticle && (
            <span className="text-xs font-medium text-[#005928]">Generating article...</span>
          )}
        </div>

        <div className="mt-4">
          <TextEditor
            value={form.content}
            onChange={handleEditorChange}
            placeholder="Write your announcement here..."
            minHeight={240}
          />
        </div>
      </section>

      {/* ANNOUNCEMENT IMAGE */}
      <section className="mb-6 rounded-xl border border-gray-200/90 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <h2 className="text-sm font-bold text-gray-900">Announcement Image</h2>
        <p className="mt-0.5 text-xs text-gray-400">Upload an image to accompany the announcement.</p>

        <div className="mt-4">
          {!form.imagePreview ? (
            <button
              type="button"
              id="choose-image-btn"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[145px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center transition hover:border-[#005928] hover:bg-emerald-50/20"
            >
              <ImageIcon className="mb-2 h-7 w-7 text-[#005928]" />
              <span className="text-sm font-medium text-gray-800">Choose image</span>
              <span className="mt-1 text-xs text-gray-400">
                Upload an announcement image (PNG, JPG, max 5MB)
              </span>
            </button>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <div className="relative flex min-h-52 items-center justify-center bg-gray-100 p-4">
                <img
                  src={form.imagePreview}
                  alt="Announcement preview"
                  className="max-h-80 max-w-full rounded-lg object-contain"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  title="Remove image"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-100"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3">
                <p className="min-w-0 truncate text-xs text-gray-500">
                  {form.imageFile?.name || "Existing announcement image"}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 text-xs font-semibold text-[#005928] hover:underline"
                >
                  Replace Image
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleImageChange}
            className="hidden"
          />
        </div>
      </section>

      {/* BOTTOM ACTIONS */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <button
          type="button"
          id="save-draft-btn"
          onClick={() => setShowSaveDraftModal(true)}
          disabled={!hasFormContent || saving}
          className="h-10 rounded-lg border border-gray-200 bg-white px-6 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Draft
        </button>

        <button
          type="button"
          id="publish-announcement-btn"
          onClick={() => setShowPublishModal(true)}
          disabled={!canPublish || saving}
          className="h-10 rounded-lg bg-[#005928] px-6 text-sm font-medium text-white shadow-sm transition hover:bg-[#004720] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Publish Announcement
        </button>
      </div>

      {/* MODALS */}
      <ExistingDraftsModal
        open={showDraftsModal}
        onClose={() => setShowDraftsModal(false)}
        onUseDraft={handleUseDraft}
        drafts={draftsList}
        loading={loadingDrafts}
      />

      <ClimateForecastModal
        open={showClimateModal}
        onClose={() => setShowClimateModal(false)}
        forecast={climateForecast}
        loading={loadingForecast}
        generating={generatingArticle}
        audience={form.audience}
        onAudienceChange={(value) => updateField("audience", value)}
        onConfirmLocation={handleConfirmLocation}
        onGenerateArticle={handleGenerateArticle}
      />

      <ClearAnnouncementModal
        open={showClearModal}
        onCancel={() => setShowClearModal(false)}
        onConfirm={clearForm}
      />

      <SaveDraftModal
        open={showSaveDraftModal}
        loading={saving}
        onCancel={() => setShowSaveDraftModal(false)}
        onConfirm={handleSaveDraft}
      />

      <PublishAnnouncementModal
        open={showPublishModal}
        loading={saving}
        title={form.title}
        audience={form.audience}
        onCancel={() => setShowPublishModal(false)}
        onConfirm={handlePublish}
      />

      <Toast toasts={toasts} removeToast={removeToast} />
    </>
  );
};

export default AnnouncementPublication;
