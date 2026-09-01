import hashlib
import json
import re
import ssl
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

try:
    import certifi
except ImportError:  # pragma: no cover - requirements.txt installs it
    certifi = None

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.http import FileResponse
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import Alert, Silo

from .serializers import (
    AdminLoginSerializer,
    AlertSerializer,
    FarmerRegistrationSerializer,
    FarmerSendOTPSerializer,
    FarmerVerifyOTPSerializer,
    RetailerRegistrationSerializer,
    RetailerSendOTPSerializer,
    RetailerStatusSerializer,
    RetailerVerifyOTPSerializer,
    SiloSerializer,
    SiloUpdateSerializer,
    UserLoginSerializer,
    WarehouseOCRSerializer,
    WarehouseRegistrationSerializer,
    WarehouseSendOTPSerializer,
    WarehouseVerifyOTPSerializer,
    SupplierOCRSerializer,
    SupplierRegistrationSerializer,
    SupplierSendOTPSerializer,
    SupplierVerifyOTPSerializer,
)

from .utils import (
    create_access_token,
    create_email_verification_token,
    create_retailer_documents,
    create_retailer_user,
    get_business_user,
    get_retailer_document,
    issue_email_otp,
    list_retailers,
    require_admin,
    send_retailer_status_email,
    status_is_login_allowed,
    update_retailer_status,
    user_value_exists,
    verify_email_otp,
    verify_email_verification_token,
    verify_password,
)


from .farmer_registration import (
    create_farmer_email_verification_token,
    create_farmer_registration,
    farmer_user_value_exists,
    issue_farmer_email_otp,
    verify_farmer_email_otp,
    verify_farmer_email_verification_token,
)


from .warehouse_registration import (
    create_warehouse_email_verification_token,
    create_warehouse_registration,
    extract_warehouse_documents_ocr,
    issue_warehouse_email_otp,
    verify_warehouse_email_otp,
    verify_warehouse_email_verification_token,
    warehouse_user_value_exists,
)


from .supplier_registration import (
    create_supplier_email_verification_token,
    create_supplier_registration,
    extract_supplier_documents_ocr,
    issue_supplier_email_otp,
    supplier_user_value_exists,
    verify_supplier_email_otp,
    verify_supplier_email_verification_token,
)


# ============================================================
# PSGC CONFIG
# ============================================================

PSGC_V2 = "https://psgc.cloud/api/v2"
PSGC_REFERENCE = "https://psgc.cloud/api"

# Cache only PSGC Cloud's own ZIP reference data.  Do not scrape
# PHLPost at runtime: its TLS chain can fail on some Windows/Python
# installations and should never be allowed to break registration.
POSTAL_CACHE_KEY = "grainrise:postal-index:v5"
POSTAL_CACHE_SECONDS = 60 * 60 * 24

# PSGC responses are cached both in Django memory and on disk.
# This prevents dropdowns from randomly becoming empty when the public
# PSGC service is slow or temporarily unreachable. A previously
# successful response remains available across Django restarts.
PSGC_HTTP_CACHE_SECONDS = 60 * 60 * 24
PSGC_DISK_CACHE_DIR = Path(settings.BASE_DIR) / ".cache" / "psgc"
PSGC_FETCH_ATTEMPTS = 3
PSGC_FETCH_TIMEOUT = 10


def _https_context():
    """Return a CA context that works consistently on Windows.

    Python's bundled trust store can be incomplete on some machines.
    certifi is therefore used explicitly when available.
    """

    if certifi is not None:
        return ssl.create_default_context(cafile=certifi.where())

    return ssl.create_default_context()


# ============================================================
# PSGC HELPERS
# ============================================================

def _fix_text(value):
    """
    Fix mojibake occasionally returned by the reference source.

    Las PiÃ±as -> Las Piñas
    ParaÃ±aque -> Parañaque
    """

    if not isinstance(value, str):
        return value

    if not any(marker in value for marker in ("Ã", "Â", "â")):
        return value

    try:
        return value.encode("latin1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return value


def _clean_json(value):
    if isinstance(value, str):
        return _fix_text(value)

    if isinstance(value, list):
        return [
            _clean_json(item)
            for item in value
        ]

    if isinstance(value, dict):
        return {
            key: _clean_json(item)
            for key, item in value.items()
        }

    return value


def _psgc_cache_key(url):
    digest = hashlib.sha256(
        url.encode("utf-8")
    ).hexdigest()

    return f"grainrise:psgc:http:{digest}"


def _psgc_disk_cache_path(url):
    digest = hashlib.sha256(
        url.encode("utf-8")
    ).hexdigest()

    return PSGC_DISK_CACHE_DIR / f"{digest}.json"


def _read_psgc_disk_cache(url):
    path = _psgc_disk_cache_path(url)

    try:
        if not path.exists():
            return None

        payload = json.loads(
            path.read_text(
                encoding="utf-8"
            )
        )

        return _clean_json(payload)

    except (OSError, json.JSONDecodeError):
        return None


def _write_psgc_disk_cache(url, payload):
    path = _psgc_disk_cache_path(url)

    try:
        path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        temporary = path.with_suffix(
            ".tmp"
        )

        temporary.write_text(
            json.dumps(
                payload,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        temporary.replace(path)

    except OSError:
        # Disk caching improves resilience but must never make the
        # address endpoint fail if the local directory is read-only.
        pass


def _fetch_external_json(url):
    """Fetch PSGC JSON with retry + persistent stale-cache fallback.

    The public PSGC service is intentionally not treated as a
    single point of failure. Successful responses are cached in memory
    and on disk. If a later live request times out, GrainRise serves the
    last successful snapshot instead of returning an empty dropdown.
    """

    memory_key = _psgc_cache_key(url)

    memory_value = cache.get(
        memory_key
    )

    if memory_value is not None:
        return memory_value

    stale_value = _read_psgc_disk_cache(
        url
    )

    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        },
    )

    last_error = None

    for attempt in range(
        PSGC_FETCH_ATTEMPTS
    ):
        try:
            with urlopen(
                request,
                timeout=PSGC_FETCH_TIMEOUT,
                context=_https_context(),
            ) as response:
                raw = response.read()

            decoded = raw.decode(
                "utf-8",
                errors="replace",
            )

            payload = _clean_json(
                json.loads(decoded)
            )

            cache.set(
                memory_key,
                payload,
                timeout=PSGC_HTTP_CACHE_SECONDS,
            )

            _write_psgc_disk_cache(
                url,
                payload,
            )

            return payload

        except HTTPError as exc:
            # A 404 is meaningful to callers (for example the NCR
            # province->region fallback) and should not be hidden by
            # retries unless we already have an older successful copy.
            if exc.code == 404:
                if stale_value is not None:
                    return stale_value
                raise

            last_error = exc

        except URLError as exc:
            last_error = RuntimeError(
                f"Unable to connect to PSGC: {exc.reason}"
            )

        except json.JSONDecodeError as exc:
            last_error = RuntimeError(
                f"PSGC returned invalid JSON: {exc}"
            )

        except Exception as exc:
            last_error = exc

        if attempt < PSGC_FETCH_ATTEMPTS - 1:
            time.sleep(
                0.4 * (attempt + 1)
            )

    if stale_value is not None:
        cache.set(
            memory_key,
            stale_value,
            timeout=PSGC_HTTP_CACHE_SECONDS,
        )
        return stale_value

    if isinstance(last_error, HTTPError):
        raise last_error

    raise RuntimeError(
        f"Unable to load PSGC data after {PSGC_FETCH_ATTEMPTS} attempts: "
        f"{last_error or 'unknown error'}"
    )


def _normalize_list(payload):
    if isinstance(payload, list):
        return payload

    if isinstance(payload, dict):
        for key in (
            "data",
            "results",
            "items",
        ):
            value = payload.get(key)

            if isinstance(value, list):
                return value

    return []


# ============================================================
# POSTAL CODE INDEX
# ============================================================

def _get_postal_index():
    """Return PSGC locality code -> ZIP/postal code.

    PSGC Cloud's reference API exposes ``zip_code`` for cities and
    municipalities.  This is deliberately the only runtime ZIP source.
    A missing ZIP is returned as an empty string rather than causing the
    address form to fail.
    """

    cached = cache.get(POSTAL_CACHE_KEY)

    if cached is not None:
        return cached

    result = {}

    try:
        # PSGC Cloud exposes zip_code on the reference city and
        # municipality collections.  The unified /api/cities-municipalities
        # route is not part of this reference API, so fetch the two
        # documented collections and merge them by the same 10-digit PSGC
        # locality code used by the v2 hierarchy endpoints.
        city_payload = _fetch_external_json(
            f"{PSGC_REFERENCE}/cities"
        )

        municipality_payload = _fetch_external_json(
            f"{PSGC_REFERENCE}/municipalities"
        )

        items = (
            _normalize_list(city_payload)
            + _normalize_list(municipality_payload)
        )

        for item in items:
            code = str(item.get("code", "")).strip()
            postal_code = (
                item.get("zip_code")
                or item.get("zipCode")
                or item.get("postal_code")
                or ""
            )

            if not code:
                continue

            result[code] = (
                str(postal_code).strip()
                if postal_code
                else ""
            )

    except Exception:
        # Address hierarchy must remain usable even if ZIP lookup is
        # temporarily unavailable.
        result = {}

    cache.set(
        POSTAL_CACHE_KEY,
        result,
        timeout=POSTAL_CACHE_SECONDS,
    )

    return result


# ============================================================
# HEALTH
# ============================================================

@api_view(["GET"])
def read_root(request):
    return Response(
        {
            "message": "GrainRise API is online",
            "database": "PostgreSQL",
            "status": "online",
        }
    )


# ============================================================
# LOCATIONS — PROVINCES
# ============================================================

@api_view(["GET"])
def locations_provinces(request):
    """
    Shared by ALL GrainRise registration forms.
    """

    try:
        province_payload = _fetch_external_json(
            f"{PSGC_V2}/provinces"
        )

        region_payload = _fetch_external_json(
            f"{PSGC_V2}/regions"
        )

        provinces = _normalize_list(
            province_payload
        )

        regions = _normalize_list(
            region_payload
        )

        results = []

        # Normal provinces
        for province in provinces:
            code = province.get("code")
            name = province.get("name")

            if not code or not name:
                continue

            results.append(
                {
                    "code": str(code),
                    "name": _fix_text(str(name)),
                    "type": "province",
                }
            )

        # NCR has no province level, so expose the NCR region
        # as a selectable Province-like option.
        for region in regions:
            region_name = _fix_text(
                str(
                    region.get(
                        "name",
                        "",
                    )
                )
            )

            normalized = (
                region_name
                .strip()
                .lower()
            )

            if (
                "national capital region"
                in normalized
                or normalized == "ncr"
            ):
                region_code = region.get(
                    "code"
                )

                if region_code:
                    results.append(
                        {
                            "code": str(region_code),
                            "name": "Metro Manila (NCR)",
                            "type": "region",
                        }
                    )

                break

        results.sort(
            key=lambda item:
                item["name"].lower()
        )

        return Response(
            {
                "results": results
            }
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    (
                        "Unable to load provinces: "
                        f"{exc}"
                    )
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


# ============================================================
# LOCATIONS — CITIES / MUNICIPALITIES
# ============================================================

@api_view(["GET"])
def locations_cities_municipalities(
    request,
    parent_code,
):
    """
    Normal provinces:
        /api/v2/provinces/{code}/cities-municipalities

    NCR:
        if province lookup returns 404, use:
        /api/v2/regions/{code}/cities-municipalities
    """

    safe_code = quote(
        str(parent_code),
        safe="",
    )

    province_url = (
        f"{PSGC_V2}/provinces/"
        f"{safe_code}/cities-municipalities"
    )

    region_url = (
        f"{PSGC_V2}/regions/"
        f"{safe_code}/cities-municipalities"
    )

    try:
        try:
            payload = _fetch_external_json(
                province_url
            )

        except HTTPError as exc:
            if exc.code != 404:
                raise

            # NCR
            payload = _fetch_external_json(
                region_url
            )

        items = _normalize_list(
            payload
        )

        results = []

        for item in items:
            code = item.get("code")
            name = item.get("name")

            if not code or not name:
                continue

            code = str(code)

            results.append(
                {
                    "code": code,
                    "name": _fix_text(
                        str(name)
                    ),
                    "type": item.get(
                        "type",
                        "",
                    ),

                }
            )

        results.sort(
            key=lambda item:
                item["name"].lower()
        )

        return Response(
            {
                "results": results
            }
        )

    except HTTPError as exc:
        return Response(
            {
                "detail":
                    (
                        "Unable to load cities/"
                        f"municipalities. HTTP {exc.code}."
                    )
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    (
                        "Unable to load cities and "
                        f"municipalities: {exc}"
                    )
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


# ============================================================
# LOCATIONS — LOCALITY DETAIL / POSTAL CODE
# ============================================================

@api_view(["GET"])
def locations_locality_detail(
    request,
    locality_code,
):
    """
    Postal code lookup by the SAME PSGC locality code.

    No name guessing.
    No v1/v2 conversion.
    No barangay request dependency.

    Postal code remains editable on the frontend.
    """

    try:
        postal_index = _get_postal_index()

        code = str(
            locality_code
        ).strip()

        postal_code = (
            postal_index.get(
                code,
                "",
            )
        )

        return Response(
            {
                "code": code,

                "postal_code":
                    postal_code,

                "editable":
                    True,

                "source":
                    (
                        "psgc"
                        if postal_code
                        else "manual"
                    ),

                "warning":
                    (
                        ""
                        if postal_code
                        else
                        (
                            "PSGC does not provide one unique "
                            "postal code for this locality. "
                            "Please enter the correct postal code manually."
                        )
                    ),
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        # ZIP failure must never break address selection.

        return Response(
            {
                "code":
                    str(locality_code),

                "postal_code":
                    "",

                "editable":
                    True,

                "source":
                    "manual",

                "warning":
                    (
                        "Automatic postal lookup failed. "
                        "Please enter the correct postal code manually. "
                        f"{exc}"
                    ),
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# LOCATIONS — BARANGAYS
# ============================================================

@api_view(["GET"])
def locations_barangays(
    request,
    locality_code,
):
    safe_code = quote(
        str(locality_code),
        safe="",
    )

    try:
        payload = _fetch_external_json(
            f"{PSGC_V2}/cities-municipalities/"
            f"{safe_code}/barangays"
        )

        items = _normalize_list(
            payload
        )

        results = []

        for item in items:
            code = item.get("code")
            name = item.get("name")

            if not name:
                continue

            results.append(
                {
                    "code":
                        str(code or ""),

                    "name":
                        _fix_text(
                            str(name)
                        ),
                }
            )

        results.sort(
            key=lambda item:
                item["name"].lower()
        )

        return Response(
            {
                "results":
                    results
            }
        )

    except HTTPError as exc:
        return Response(
            {
                "detail":
                    (
                        "Barangays were not found "
                        f"for this locality. HTTP {exc.code}."
                    )
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    (
                        "Unable to load barangays: "
                        f"{exc}"
                    )
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


# ============================================================
# RETAILER — SEND OTP
# ============================================================

@api_view(["POST"])
def send_retailer_otp(request):
    serializer = RetailerSendOTPSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = (
        serializer
        .validated_data["email"]
        .strip()
        .lower()
    )

    username = (
        serializer
        .validated_data
        .get(
            "username",
            "",
        )
        .strip()
    )

    try:
        if user_value_exists(
            "email",
            email,
        ):
            return Response(
                {
                    "detail":
                        (
                            "This email address "
                            "is already registered."
                        )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            username
            and user_value_exists(
                "username",
                username,
            )
        ):
            return Response(
                {
                    "detail":
                        (
                            "This username "
                            "is already registered."
                        )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        retry_after = issue_email_otp(
            email
        )

        if retry_after == 0:
            return Response(
                {
                    "detail":
                        (
                            "An OTP was recently sent. "
                            "Please wait before requesting "
                            "another verification code."
                        ),

                    "retry_after": 60,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        return Response(
            {
                "message":
                    "OTP sent successfully.",

                "retry_after":
                    retry_after,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    (
                        "Unable to send OTP email. "
                        f"{exc}"
                    )
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# RETAILER — VERIFY OTP
# ============================================================

@api_view(["POST"])
def verify_retailer_otp(request):
    serializer = RetailerVerifyOTPSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = (
        serializer
        .validated_data["email"]
        .strip()
        .lower()
    )

    otp = (
        serializer
        .validated_data["otp"]
    )

    if not verify_email_otp(
        email,
        otp,
    ):
        return Response(
            {
                "detail":
                    (
                        "Invalid or expired OTP. "
                        "Please request a new "
                        "verification code."
                    )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    verification_token = (
        create_email_verification_token(
            email
        )
    )

    return Response(
        {
            "message":
                "Email verified successfully.",

            "verification_token":
                verification_token,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# RETAILER — REGISTER
# ============================================================

@api_view(["POST"])
@parser_classes(
    [
        MultiPartParser,
        FormParser,
    ]
)
def register_retailer(request):
    serializer = RetailerRegistrationSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data

    email = (
        data["email"]
        .strip()
        .lower()
    )

    if not verify_email_verification_token(
        data["verification_token"],
        email,
    ):
        return Response(
            {
                "detail":
                    (
                        "Email verification is invalid "
                        "or expired. Please verify "
                        "your email again."
                    )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        if user_value_exists(
            "email",
            email,
        ):
            return Response(
                {
                    "detail":
                        "Email is already registered."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            data.get("username")
            and user_value_exists(
                "username",
                data["username"],
            )
        ):
            return Response(
                {
                    "detail":
                        "Username is already registered."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            user_id = create_retailer_user(
                data
            )

            retailer_document_id = (
                create_retailer_documents(
                    user_id=user_id,

                    barangay_permit=
                        data["barangay_permit"],

                    valid_id=
                        data["valid_id"],
                )
            )

        return Response(
            {
                "message":
                    (
                        "Retailer registration "
                        "submitted successfully."
                    ),

                "user_id":
                    user_id,

                "retailer_document_id":
                    retailer_document_id,

                "user_role":
                    "retailer",

                "status":
                    "inactive",
            },
            status=status.HTTP_201_CREATED,
        )

    except IntegrityError as exc:
        return Response(
            {
                "detail":
                    (
                        "Registration could not "
                        f"be saved: {exc}"
                    )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    (
                        "Registration could not be saved "
                        f"to PostgreSQL: {exc}"
                    )
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# FARMER — SEND OTP
# ============================================================

@api_view(["POST"])
def send_farmer_otp(request):
    serializer = FarmerSendOTPSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data

    email = (
        data["email"]
        .strip()
        .lower()
    )

    username = (
        str(
            data.get(
                "username",
                "",
            )
            or ""
        )
        .strip()
    )

    try:
        if farmer_user_value_exists(
            "email",
            email,
        ):
            return Response(
                {
                    "detail":
                        (
                            "This email address "
                            "is already registered."
                        )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            username
            and farmer_user_value_exists(
                "username",
                username,
            )
        ):
            return Response(
                {
                    "detail":
                        (
                            "This username "
                            "is already registered."
                        )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        retry_after = issue_farmer_email_otp(
            email
        )

        if retry_after == 0:
            return Response(
                {
                    "detail":
                        (
                            "An OTP was recently sent. "
                            "Please wait before requesting "
                            "another verification code."
                        ),

                    "retry_after": 60,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        return Response(
            {
                "message":
                    "OTP sent successfully.",

                "retry_after":
                    retry_after,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    (
                        "Unable to send Farmer OTP email. "
                        f"{exc}"
                    )
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# FARMER — VERIFY OTP
# ============================================================

@api_view(["POST"])
def verify_farmer_otp(request):
    serializer = FarmerVerifyOTPSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = (
        serializer
        .validated_data["email"]
        .strip()
        .lower()
    )

    otp = (
        serializer
        .validated_data["otp"]
    )

    if not verify_farmer_email_otp(
        email,
        otp,
    ):
        return Response(
            {
                "detail":
                    (
                        "Invalid or expired OTP. "
                        "Please request a new "
                        "verification code."
                    )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    verification_token = (
        create_farmer_email_verification_token(
            email
        )
    )

    return Response(
        {
            "message":
                "Email verified successfully.",

            "verification_token":
                verification_token,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# FARMER — REGISTER
# ============================================================

@api_view(["POST"])
@parser_classes(
    [
        MultiPartParser,
        FormParser,
    ]
)
def register_farmer(request):
    serializer = FarmerRegistrationSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data

    email = (
        data["email"]
        .strip()
        .lower()
    )

    if not verify_farmer_email_verification_token(
        data["verification_token"],
        email,
    ):
        return Response(
            {
                "detail":
                    (
                        "Email verification is invalid "
                        "or expired. Please verify "
                        "your email again."
                    )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = create_farmer_registration(
            data,
            rsbsa_document=data.get(
                "rsbsa_document"
            ),
        )

        return Response(
            {
                "message":
                    (
                        "Farmer registration "
                        "submitted successfully."
                    ),

                "user_id":
                    result["user_id"],

                "farm_id":
                    result["farm_id"],

                "farmer_compliance_id":
                    result["farmer_compliance_id"],

                "user_role":
                    result["user_role"],

                "status":
                    result["status"],
            },
            status=status.HTTP_201_CREATED,
        )

    except ValueError as exc:
        return Response(
            {
                "detail": str(exc)
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except IntegrityError as exc:
        return Response(
            {
                "detail":
                    (
                        "Farmer registration could not "
                        f"be saved: {exc}"
                    )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    (
                        "Farmer registration could not be "
                        f"saved to PostgreSQL: {exc}"
                    )
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )



# ============================================================
# WAREHOUSE MANAGER — SEND OTP
# ============================================================

@api_view(["POST"])
def send_warehouse_otp(request):
    serializer = WarehouseSendOTPSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data
    email = data["email"].strip().lower()
    username = str(data.get("username", "") or "").strip()

    try:
        if warehouse_user_value_exists(
            "email",
            email,
        ):
            return Response(
                {
                    "detail":
                        "This email address is already registered."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            username
            and warehouse_user_value_exists(
                "username",
                username,
            )
        ):
            return Response(
                {
                    "detail":
                        "This username is already registered."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        retry_after = issue_warehouse_email_otp(
            email
        )

        if retry_after == 0:
            return Response(
                {
                    "detail":
                        (
                            "An OTP was recently sent. "
                            "Please wait before requesting "
                            "another verification code."
                        ),
                    "retry_after": 60,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        return Response(
            {
                "message":
                    "OTP sent successfully.",
                "retry_after":
                    retry_after,
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as exc:
        return Response(
            {
                "detail": str(exc)
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    (
                        "Unable to send Warehouse Manager "
                        f"OTP email. {exc}"
                    )
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# WAREHOUSE MANAGER — VERIFY OTP
# ============================================================

@api_view(["POST"])
def verify_warehouse_otp(request):
    serializer = WarehouseVerifyOTPSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = (
        serializer
        .validated_data["email"]
        .strip()
        .lower()
    )

    otp = serializer.validated_data["otp"]

    if not verify_warehouse_email_otp(
        email,
        otp,
    ):
        return Response(
            {
                "detail":
                    (
                        "Invalid or expired OTP. "
                        "Please request a new "
                        "verification code."
                    )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    verification_token = (
        create_warehouse_email_verification_token(
            email
        )
    )

    return Response(
        {
            "message":
                "Email verified successfully.",
            "verification_token":
                verification_token,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# WAREHOUSE MANAGER — OCR DOCUMENTS
# ============================================================

@api_view(["POST"])
@parser_classes(
    [
        MultiPartParser,
        FormParser,
    ]
)
def extract_warehouse_documents(request):
    serializer = WarehouseOCRSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data

    documents = {
        "government_issued_id":
            data["government_issued_id"],
        "business_permit":
            data["business_permit"],
        "business_registration":
            data["business_registration"],
        "warehouse_license":
            data["warehouse_license"],
    }

    try:
        autofill = extract_warehouse_documents_ocr(
            documents
        )

        return Response(
            {
                "message":
                    (
                        "Documents processed successfully. "
                        "Please review and edit the detected "
                        "business information before submitting."
                    ),
                "autofill": autofill,
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as exc:
        return Response(
            {
                "detail": str(exc)
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except RuntimeError as exc:
        return Response(
            {
                "detail": str(exc)
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    (
                        "Warehouse document OCR failed. "
                        f"{exc}"
                    )
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# WAREHOUSE MANAGER — REGISTER
# ============================================================

@api_view(["POST"])
@parser_classes(
    [
        MultiPartParser,
        FormParser,
    ]
)
def register_warehouse(request):
    serializer = WarehouseRegistrationSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data
    email = data["email"].strip().lower()

    if not verify_warehouse_email_verification_token(
        data["verification_token"],
        email,
    ):
        return Response(
            {
                "detail":
                    (
                        "Email verification is invalid "
                        "or expired. Please verify "
                        "your email again."
                    )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    documents = {
        "government_issued_id":
            data["government_issued_id"],
        "business_permit":
            data["business_permit"],
        "business_registration":
            data["business_registration"],
        "warehouse_license":
            data["warehouse_license"],
    }

    try:
        result = create_warehouse_registration(
            data,
            documents,
        )

        return Response(
            {
                "message":
                    (
                        "Warehouse Manager registration "
                        "submitted successfully."
                    ),
                "user_id":
                    result["user_id"],
                "warehouse_profile_id":
                    result["warehouse_profile_id"],
                "warehouse_document_id":
                    result["warehouse_document_id"],
                "user_role":
                    result["user_role"],
                "status":
                    result["status"],
            },
            status=status.HTTP_201_CREATED,
        )

    except ValueError as exc:
        return Response(
            {
                "detail": str(exc)
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except IntegrityError as exc:
        return Response(
            {
                "detail":
                    (
                        "Warehouse Manager registration "
                        f"could not be saved: {exc}"
                    )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    (
                        "Warehouse Manager registration "
                        "could not be saved to PostgreSQL: "
                        f"{exc}"
                    )
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# SUPPLIER / MILLER — SEND OTP
# ============================================================

@api_view(["POST"])
def send_supplier_otp(request):
    serializer = SupplierSendOTPSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data
    email = data["email"].strip().lower()
    username = str(data.get("username", "") or "").strip()

    try:
        if supplier_user_value_exists(
            "email",
            email,
        ):
            return Response(
                {
                    "detail":
                        "This email address is already registered."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            username
            and supplier_user_value_exists(
                "username",
                username,
            )
        ):
            return Response(
                {
                    "detail":
                        "This username is already registered."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        retry_after = issue_supplier_email_otp(
            email
        )

        if retry_after == 0:
            return Response(
                {
                    "detail":
                        (
                            "An OTP was recently sent. "
                            "Please wait before requesting "
                            "another verification code."
                        ),
                    "retry_after": 60,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        return Response(
            {
                "message":
                    "OTP sent successfully.",
                "retry_after":
                    retry_after,
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as exc:
        return Response(
            {
                "detail": str(exc)
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    (
                        "Unable to send Supplier / Miller "
                        f"OTP email. {exc}"
                    )
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# SUPPLIER / MILLER — VERIFY OTP
# ============================================================

@api_view(["POST"])
def verify_supplier_otp(request):
    serializer = SupplierVerifyOTPSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = (
        serializer
        .validated_data["email"]
        .strip()
        .lower()
    )

    otp = serializer.validated_data["otp"]

    if not verify_supplier_email_otp(
        email,
        otp,
    ):
        return Response(
            {
                "detail":
                    (
                        "Invalid or expired OTP. "
                        "Please request a new "
                        "verification code."
                    )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    verification_token = (
        create_supplier_email_verification_token(
            email
        )
    )

    return Response(
        {
            "message":
                "Email verified successfully.",
            "verification_token":
                verification_token,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# SUPPLIER / MILLER — OCR DOCUMENTS
# ============================================================

@api_view(["POST"])
@parser_classes(
    [
        MultiPartParser,
        FormParser,
    ]
)
def extract_supplier_documents(request):
    serializer = SupplierOCRSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data

    documents = {
        "government_issued_id":
            data["government_issued_id"],
        "business_permit":
            data["business_permit"],
        "business_registration":
            data["business_registration"],
        "milling_license":
            data["milling_license"],
    }

    try:
        autofill = extract_supplier_documents_ocr(
            documents
        )

        return Response(
            {
                "message":
                    (
                        "Documents processed successfully. "
                        "Please review and edit the detected "
                        "business information before submitting."
                    ),
                "autofill": autofill,
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as exc:
        return Response(
            {
                "detail": str(exc)
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except RuntimeError as exc:
        return Response(
            {
                "detail": str(exc)
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    (
                        "Supplier / Miller document OCR failed. "
                        f"{exc}"
                    )
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# SUPPLIER / MILLER — REGISTER
# ============================================================

@api_view(["POST"])
@parser_classes(
    [
        MultiPartParser,
        FormParser,
    ]
)
def register_supplier(request):
    serializer = SupplierRegistrationSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data
    email = data["email"].strip().lower()

    if not verify_supplier_email_verification_token(
        data["verification_token"],
        email,
    ):
        return Response(
            {
                "detail":
                    (
                        "Email verification is invalid "
                        "or expired. Please verify "
                        "your email again."
                    )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    documents = {
        "government_issued_id":
            data["government_issued_id"],
        "business_permit":
            data["business_permit"],
        "business_registration":
            data["business_registration"],
        "milling_license":
            data["milling_license"],
    }

    try:
        result = create_supplier_registration(
            data,
            documents,
        )

        return Response(
            {
                "message":
                    (
                        "Supplier / Miller registration "
                        "submitted successfully."
                    ),
                "user_id":
                    result["user_id"],
                "supplier_profile_id":
                    result["supplier_profile_id"],
                "supplier_document_id":
                    result["supplier_document_id"],
                "user_role":
                    result["user_role"],
                "status":
                    result["status"],
            },
            status=status.HTTP_201_CREATED,
        )

    except ValueError as exc:
        return Response(
            {
                "detail": str(exc)
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except IntegrityError as exc:
        return Response(
            {
                "detail":
                    (
                        "Supplier / Miller registration "
                        f"could not be saved: {exc}"
                    )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    (
                        "Supplier / Miller registration "
                        "could not be saved to PostgreSQL: "
                        f"{exc}"
                    )
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# GENERIC REGISTER
# ============================================================

@api_view(["POST"])
def register(request):
    return Response(
        {
            "detail":
                "Use a role-specific registration endpoint."
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


# ============================================================
# BUSINESS LOGIN
# ============================================================

@api_view(["POST"])
def login(request):
    serializer = UserLoginSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    identifier = (
        serializer
        .validated_data["identifier"]
        .strip()
    )

    password = (
        serializer
        .validated_data["password"]
    )

    try:
        user = get_business_user(
            identifier
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    f"Database error: {exc}"
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if (
        not user
        or not verify_password(
            password,
            user.get("password_hash"),
        )
    ):
        return Response(
            {
                "detail":
                    (
                        "Incorrect email/username "
                        "or password."
                    )
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not status_is_login_allowed(
        user.get("status")
    ):
        return Response(
            {
                "detail":
                    (
                        "Your account is not active. "
                        "Administrator approval is required."
                    )
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    access_token = create_access_token(
        {
            "sub":
                str(user["id"]),

            "role":
                str(user["role"]),

            "auth_source":
                "grainrise_users",
        }
    )

    return Response(
        {
            "access_token":
                access_token,

            "token_type":
                "bearer",

            "user": {
                "id":
                    user["id"],

                "first_name":
                    user["first_name"],

                "last_name":
                    user["last_name"],

                "email":
                    user["email"],

                "username":
                    user["username"],

                "role":
                    str(user["role"]),

                "status":
                    str(user["status"]),
            },
        }
    )


# ============================================================
# ADMIN LOGIN
# ============================================================

@api_view(["POST"])
def admin_login(request):
    identifier = (
        request.data.get("email")
        or request.data.get("username")
        or ""
    )

    serializer = AdminLoginSerializer(
        data={
            "username":
                identifier,

            "password":
                request.data.get(
                    "password",
                    "",
                ),
        }
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    identifier = (
        serializer
        .validated_data["username"]
        .strip()
    )

    password = (
        serializer
        .validated_data["password"]
    )

    DjangoUser = get_user_model()

    admin_record = (
        DjangoUser.objects
        .filter(
            email__iexact=identifier,
            is_staff=True,
            is_active=True,
        )
        .first()
    )

    if not admin_record:
        admin_record = (
            DjangoUser.objects
            .filter(
                username__iexact=identifier,
                is_staff=True,
                is_active=True,
            )
            .first()
        )

    if not admin_record:
        return Response(
            {
                "detail":
                    "Invalid administrator credentials."
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    admin_user = authenticate(
        request,
        username=admin_record.username,
        password=password,
    )

    if (
        not admin_user
        or not admin_user.is_staff
    ):
        return Response(
            {
                "detail":
                    "Invalid administrator credentials."
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    token = create_access_token(
        {
            "sub":
                str(admin_user.pk),

            "role":
                "admin",

            "auth_source":
                "django_admin",
        }
    )

    return Response(
        {
            "access_token":
                token,

            "token_type":
                "bearer",

            "user": {
                "id":
                    admin_user.pk,

                "email":
                    admin_user.email,

                "username":
                    admin_user.username,

                "role":
                    "admin",
            },
        }
    )


# ============================================================
# ADMIN — RETAILERS
# ============================================================

@api_view(["GET"])
def admin_retailers(request):
    if not require_admin(request):
        return Response(
            {
                "detail":
                    "Administrator authentication required."
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        return Response(
            {
                "retailers":
                    list_retailers()
            }
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    f"Unable to load retailers: {exc}"
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# ADMIN — STATUS
# ============================================================

@api_view(["PATCH"])
def admin_retailer_status(
    request,
    user_id,
):
    if not require_admin(request):
        return Response(
            {
                "detail":
                    "Administrator authentication required."
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    serializer = RetailerStatusSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    action_status_map = {
        "approve": "active",
        "restore": "active",
        "deactivate": "deactivated",
        "archive": "archived",
        "reject": "archived",
    }

    action = (
        serializer
        .validated_data["action"]
    )

    new_status = (
        action_status_map.get(action)
    )

    if not new_status:
        return Response(
            {
                "detail":
                    "Unsupported status action."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        saved_status = update_retailer_status(
            user_id,
            new_status,
        )

        return Response(
            {
                "message":
                    "Retailer status updated successfully.",

                "status":
                    saved_status,
            }
        )

    except Exception as exc:
        return Response(
            {
                "detail": str(exc)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# ADMIN — DOCUMENT
# ============================================================

@api_view(["GET"])
def admin_retailer_document(
    request,
    user_id,
    document_kind,
):
    if not require_admin(request):
        return Response(
            {
                "detail":
                    "Administrator authentication required."
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        file_path = get_retailer_document(
            user_id,
            document_kind,
        )

        return FileResponse(
            file_path.open("rb"),
            as_attachment=False,
            filename=file_path.name,
        )

    except Exception as exc:
        return Response(
            {
                "detail": str(exc)
            },
            status=status.HTTP_404_NOT_FOUND,
        )


# ============================================================
# SILOS
# ============================================================

@api_view(["GET", "POST"])
def silos_list(request):
    if request.method == "GET":
        return Response(
            SiloSerializer(
                Silo.objects.all(),
                many=True,
            ).data
        )

    serializer = SiloSerializer(
        data=request.data
    )

    if serializer.is_valid():
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["PUT", "PATCH"])
def update_silo(
    request,
    silo_id,
):
    try:
        silo = Silo.objects.get(
            id=silo_id
        )

    except Silo.DoesNotExist:
        return Response(
            {
                "detail":
                    "Silo not found."
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = SiloUpdateSerializer(
        silo,
        data=request.data,
        partial=True,
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    silo = serializer.save()

    silo.last_updated = timezone.now()

    silo.save()

    return Response(
        SiloSerializer(
            silo
        ).data
    )


# ============================================================
# ALERTS
# ============================================================

@api_view(["GET"])
def alerts_list(request):
    alerts = (
        Alert.objects
        .all()
        .order_by("-created_at")
    )

    return Response(
        AlertSerializer(
            alerts,
            many=True,
        ).data
    )


@api_view(["PUT", "PATCH"])
def resolve_alert(
    request,
    alert_id,
):
    try:
        alert = Alert.objects.get(
            id=alert_id
        )

    except Alert.DoesNotExist:
        return Response(
            {
                "detail":
                    "Alert not found."
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    alert.is_resolved = True
    alert.save()

    return Response(
        AlertSerializer(
            alert
        ).data
    )