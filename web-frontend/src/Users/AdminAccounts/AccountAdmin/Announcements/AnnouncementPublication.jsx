import {
  useRef,
  useState,
} from "react";

import {
  CloudSun,
  FileText,
  ImagePlus,
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

  const fileInputRef =
    useRef(null);


  const [
    form,
    setForm,
  ] = useState(
    INITIAL_FORM
  );


  const [
    showDraftsModal,
    setShowDraftsModal,
  ] = useState(false);


  const [
    showClimateModal,
    setShowClimateModal,
  ] = useState(false);


  const [
    showClearModal,
    setShowClearModal,
  ] = useState(false);


  const [
    showSaveDraftModal,
    setShowSaveDraftModal,
  ] = useState(false);


  const [
    showPublishModal,
    setShowPublishModal,
  ] = useState(false);


  const {
    forecast: climateForecast,
    loadingForecast,
    fetchClimateForecast,
    generatingArticle,
    generateClimateArticle,
  } = useAnnouncementClimate();

  const {
    saveAdminDraft,
    publishAdminAnnouncement,
    loadAdminDrafts,
  } = useAnnouncementAdmin();

  const {
    toasts,
    showToast,
    removeToast,
  } = useToast();

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    draftsList,
    setDraftsList,
  ] = useState([]);

  const [
    loadingDrafts,
    setLoadingDrafts,
  ] = useState(false);


  const updateField = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };


  const handleEditorChange = (
    html,
    text
  ) => {
    setForm((current) => ({
      ...current,
      content: html,
      contentText: text,
    }));
  };


  const handleImageChange = (
    event
  ) => {

    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      event.target.value = "";
      return;
    }


    const preview =
      URL.createObjectURL(
        file
      );


    if (
      form.imagePreview?.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        form.imagePreview
      );
    }


    setForm((current) => ({
      ...current,
      imageFile: file,
      imagePreview: preview,
      existingImageUrl: "",
    }));
  };


  const removeImage = () => {

    if (
      form.imagePreview?.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        form.imagePreview
      );
    }


    setForm((current) => ({
      ...current,
      imageFile: null,
      imagePreview: "",
      existingImageUrl: "",
    }));


    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  };


  const handleUseDraft = (
    draft
  ) => {

    if (!draft) {
      return;
    }


    setForm({
      announcementId:
        draft.announcement_id ??
        null,

      title:
        draft.title ??
        "",

      audience:
        draft.audience ??
        "",

      content:
        draft.content ??
        "",

      contentText:
        draft.content_text ??
        "",

      imageFile:
        null,

      imagePreview:
        draft.image_url ??
        "",

      existingImageUrl:
        draft.image_url ??
        "",
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


  const handleOpenClimate = () => {
    setShowClimateModal(true);
  };


  const handleConfirmLocation = async (location) => {
    try {
      await fetchClimateForecast(location);
    } catch (err) {
      showToast({
        type: "error",
        title: "Climate Retrieval Failed",
        message: err?.message || "Unable to retrieve climate forecast from Copernicus CDS.",
      });
    }
  };


  const handleGenerateArticle = async ({
    audience,
    range,
    forecast,
    location,
  }) => {
    try {
      const generated = await generateClimateArticle({
        audience,
        range,
        forecast,
        location,
      });

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
    if (
      form.imagePreview?.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        form.imagePreview
      );
    }

    setForm(
      INITIAL_FORM
    );

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }

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


  const hasFormContent =
    Boolean(
      form.title.trim() ||
      form.audience ||
      form.contentText.trim() ||
      form.imageFile ||
      form.existingImageUrl
    );


  const canPublish =
    Boolean(
      form.title.trim() &&
      form.audience &&
      form.contentText.trim()
    );


  return (
    <>
      <section
        className="
          rounded-2xl
          border
          border-gray-200
          bg-white
          p-6
          shadow-sm
        "
      >

        {/* SECTION HEADER */}

        <div
          className="
            mb-6
            border-b
            border-gray-100
            pb-5
          "
        >
          <h2
            className="
              text-xl
              font-bold
              text-gray-900
            "
          >
            Create Announcement
          </h2>

          <p
            className="
              mt-1
              text-sm
              text-gray-500
            "
          >
            Write an announcement
            manually or use the latest
            climate forecast to prepare
            an article draft.
          </p>
        </div>


        {/* FIRST ROW */}

        <div
          className="
            grid
            grid-cols-1
            gap-4
            xl:grid-cols-[auto_minmax(0,1fr)_auto]
            xl:items-end
          "
        >

          {/* USE EXISTING DRAFT */}

          <div>
            <label
              className="
                mb-2
                block
                text-sm
                font-semibold
                text-gray-700
                xl:invisible
              "
            >
              Existing Draft
            </label>

            <button
              type="button"
              onClick={
                handleOpenDrafts
              }
              className="
                flex
                h-11
                w-full
                items-center
                justify-center
                gap-2
                rounded-lg
                border
                border-[#08511f]
                bg-white
                px-4
                text-sm
                font-semibold
                text-[#08511f]
                transition
                hover:bg-emerald-50
                xl:w-auto
              "
            >
              <FileText
                size={17}
              />

              Use Existing Draft
            </button>
          </div>


          {/* TITLE */}

          <div>
            <label
              htmlFor="announcement-title"
              className="
                mb-2
                block
                text-sm
                font-semibold
                text-gray-700
              "
            >
              Announcement Title
            </label>

            <input
              id="announcement-title"
              type="text"
              value={form.title}
              onChange={(event) =>
                updateField(
                  "title",
                  event.target.value
                )
              }
              maxLength={255}
              placeholder="Enter announcement title"
              className="
                h-11
                w-full
                rounded-lg
                border
                border-gray-300
                bg-white
                px-3.5
                text-sm
                text-gray-900
                outline-none
                transition
                placeholder:text-gray-400
                focus:border-[#08511f]
                focus:ring-1
                focus:ring-[#08511f]
              "
            />
          </div>


          {/* CLIMATE + AI */}

          <div>
            <label
              className="
                mb-2
                block
                text-sm
                font-semibold
                text-gray-700
                xl:invisible
              "
            >
              Climate Assistance
            </label>

            <button
              type="button"
              onClick={
                handleOpenClimate
              }
              disabled={
                loadingForecast
              }
              className="
                flex
                h-11
                w-full
                items-center
                justify-center
                gap-2
                rounded-lg
                bg-[#08511f]
                px-4
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-[#063d18]
                disabled:cursor-not-allowed
                disabled:opacity-60
                xl:w-auto
              "
            >
              <CloudSun
                size={18}
              />

              {loadingForecast
                ? "Getting Climate Forecast..."
                : "Get Climate Forecast & Generate with AI"}
            </button>
          </div>
        </div>


        {/* AUDIENCE */}

        <div
          className="
            mt-6
          "
        >
          <label
            htmlFor="announcement-audience"
            className="
              mb-2
              block
              text-sm
              font-semibold
              text-gray-700
            "
          >
            Choose Audience
          </label>

          <select
            id="announcement-audience"
            value={
              form.audience
            }
            onChange={(event) =>
              updateField(
                "audience",
                event.target.value
              )
            }
            className="
              h-11
              w-full
              rounded-lg
              border
              border-gray-300
              bg-white
              px-3.5
              text-sm
              text-gray-700
              outline-none
              transition
              focus:border-[#08511f]
              focus:ring-1
              focus:ring-[#08511f]
            "
          >
            <option value="">
              Select audience
            </option>

            <option value="all">
              All
            </option>

            <option value="miller">
              Miller
            </option>

            <option value="warehouse">
              Warehouse
            </option>

            <option value="retailer">
              Retailer
            </option>
          </select>
        </div>


        {/* ARTICLE CONTENT */}

        <div
          className="
            mt-6
          "
        >
          <div
            className="
              mb-2
              flex
              items-center
              justify-between
              gap-3
            "
          >
            <label
              className="
                text-sm
                font-semibold
                text-gray-700
              "
            >
              Article Content
            </label>

            {generatingArticle && (
              <span
                className="
                  text-xs
                  font-medium
                  text-[#08511f]
                "
              >
                Generating article...
              </span>
            )}
          </div>

          <TextEditor
            value={
              form.content
            }
            onChange={
              handleEditorChange
            }
            placeholder="Write your announcement here..."
            minHeight={320}
          />
        </div>


        {/* IMAGE UPLOAD */}

        <div
          className="
            mt-6
          "
        >
          <label
            className="
              mb-2
              block
              text-sm
              font-semibold
              text-gray-700
            "
          >
            Announcement Image
          </label>


          {!form.imagePreview ? (
            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="
                flex
                min-h-36
                w-full
                flex-col
                items-center
                justify-center
                rounded-xl
                border
                border-dashed
                border-gray-300
                bg-gray-50
                px-5
                py-6
                text-center
                transition
                hover:border-[#08511f]
                hover:bg-emerald-50/40
              "
            >
              <div
                className="
                  mb-3
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  bg-emerald-50
                  text-[#08511f]
                "
              >
                <ImagePlus
                  size={21}
                />
              </div>

              <span
                className="
                  text-sm
                  font-semibold
                  text-gray-700
                "
              >
                Choose Image
              </span>

              <span
                className="
                  mt-1
                  text-xs
                  text-gray-400
                "
              >
                PNG, JPG, JPEG,
                or WEBP
              </span>
            </button>
          ) : (
            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-gray-200
                bg-gray-50
              "
            >
              <div
                className="
                  relative
                  flex
                  min-h-52
                  items-center
                  justify-center
                  bg-gray-100
                  p-4
                "
              >
                <img
                  src={
                    form.imagePreview
                  }
                  alt="Announcement preview"
                  className="
                    max-h-80
                    max-w-full
                    rounded-lg
                    object-contain
                  "
                />

                <button
                  type="button"
                  onClick={
                    removeImage
                  }
                  title="Remove image"
                  className="
                    absolute
                    right-3
                    top-3
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-gray-200
                    bg-white
                    text-gray-600
                    shadow-sm
                    transition
                    hover:bg-gray-100
                  "
                >
                  <X size={16} />
                </button>
              </div>


              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  border-t
                  border-gray-200
                  bg-white
                  px-4
                  py-3
                "
              >
                <p
                  className="
                    min-w-0
                    truncate
                    text-xs
                    text-gray-500
                  "
                >
                  {
                    form.imageFile?.name ||
                    "Existing announcement image"
                  }
                </p>

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="
                    shrink-0
                    text-xs
                    font-semibold
                    text-[#08511f]
                    hover:underline
                  "
                >
                  Replace Image
                </button>
              </div>
            </div>
          )}


          <input
            ref={fileInputRef}
            type="file"
            accept="
              image/png,
              image/jpeg,
              image/webp
            "
            onChange={
              handleImageChange
            }
            className="hidden"
          />
        </div>


        {/* ACTIONS */}

        <div
          className="
            mt-8
            flex
            flex-col
            gap-3
            border-t
            border-gray-100
            pt-5
            sm:flex-row
            sm:items-center
          "
        >
          <button
            type="button"
            onClick={() =>
              setShowClearModal(
                true
              )
            }
            disabled={
              !hasFormContent ||
              saving
            }
            className="
              h-11
              rounded-lg
              border
              border-gray-300
              bg-white
              px-5
              text-sm
              font-semibold
              text-gray-600
              transition
              hover:bg-gray-50
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Clear
          </button>


          <div
            className="
              hidden
              flex-1
              sm:block
            "
          />


          <button
            type="button"
            onClick={() =>
              setShowSaveDraftModal(
                true
              )
            }
            disabled={
              !hasFormContent ||
              saving
            }
            className="
              h-11
              rounded-lg
              border
              border-[#08511f]
              bg-white
              px-5
              text-sm
              font-semibold
              text-[#08511f]
              transition
              hover:bg-emerald-50
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Save as Draft
          </button>


          <button
            type="button"
            onClick={() =>
              setShowPublishModal(
                true
              )
            }
            disabled={
              !canPublish ||
              saving
            }
            className="
              h-11
              rounded-lg
              bg-[#08511f]
              px-6
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-[#063d18]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Publish
          </button>
        </div>
      </section>


      {/* MODALS */}

      <ExistingDraftsModal
        open={
          showDraftsModal
        }
        onClose={() =>
          setShowDraftsModal(
            false
          )
        }
        onUseDraft={
          handleUseDraft
        }
        drafts={
          draftsList
        }
        loading={
          loadingDrafts
        }
      />


      <ClimateForecastModal
        open={
          showClimateModal
        }
        onClose={() =>
          setShowClimateModal(
            false
          )
        }
        forecast={
          climateForecast
        }
        loading={
          loadingForecast
        }
        generating={
          generatingArticle
        }
        audience={
          form.audience
        }
        onAudienceChange={(
          value
        ) =>
          updateField(
            "audience",
            value
          )
        }
        onConfirmLocation={
          handleConfirmLocation
        }
        onGenerateArticle={
          handleGenerateArticle
        }
      />


      <ClearAnnouncementModal
        open={
          showClearModal
        }
        onCancel={() =>
          setShowClearModal(
            false
          )
        }
        onConfirm={
          clearForm
        }
      />


      <SaveDraftModal
        open={
          showSaveDraftModal
        }
        loading={
          saving
        }
        onCancel={() =>
          setShowSaveDraftModal(
            false
          )
        }
        onConfirm={
          handleSaveDraft
        }
      />


      <PublishAnnouncementModal
        open={
          showPublishModal
        }
        loading={
          saving
        }
        title={
          form.title
        }
        audience={
          form.audience
        }
        onCancel={() =>
          setShowPublishModal(
            false
          )
        }
        onConfirm={
          handlePublish
        }
      />

      <Toast
        toasts={toasts}
        removeToast={removeToast}
      />
    </>
  );
};


export default AnnouncementPublication;