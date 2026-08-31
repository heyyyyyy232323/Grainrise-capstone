from rest_framework import serializers

from .models import Silo, Alert


# ============================================================
# EXISTING SILO SERIALIZERS
# ============================================================

class SiloSerializer(serializers.ModelSerializer):
    class Meta:
        model = Silo
        fields = "__all__"


class SiloUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Silo
        fields = [
            "name",
            "grain_type",
            "capacity",
            "current_stock",
            "temperature",
            "humidity",
            "moisture",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        for field in self.fields.values():
            field.required = False
            field.allow_null = True


# ============================================================
# EXISTING ALERT SERIALIZER
# ============================================================

class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = "__all__"


# ============================================================
# RETAILER — SEND OTP
# ============================================================

class RetailerSendOTPSerializer(serializers.Serializer):

    email = serializers.EmailField()

    username = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
    )

    def validate_email(self, value):
        return value.strip().lower()

    def validate_username(self, value):
        return value.strip()


# ============================================================
# RETAILER — VERIFY OTP
# ============================================================

class RetailerVerifyOTPSerializer(serializers.Serializer):

    email = serializers.EmailField()

    otp = serializers.RegexField(
        regex=r"^\d{6}$",
        error_messages={
            "invalid": "OTP must contain exactly 6 digits."
        },
    )

    def validate_email(self, value):
        return value.strip().lower()


# ============================================================
# RETAILER REGISTRATION
# ============================================================

class RetailerRegistrationSerializer(serializers.Serializer):

    # --------------------------------------------------------
    # PERSONAL INFORMATION
    # --------------------------------------------------------

    first_name = serializers.CharField(
        max_length=100
    )

    middle_initial = serializers.CharField(
        max_length=10,
        required=False,
        allow_blank=True,
    )

    last_name = serializers.CharField(
        max_length=100
    )

    suffix = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
    )

    gender = serializers.CharField(
        max_length=50
    )

    # --------------------------------------------------------
    # ADDRESS
    # --------------------------------------------------------

    province = serializers.CharField(
        max_length=150
    )

    municipality = serializers.CharField(
        max_length=150
    )

    barangay = serializers.CharField(
        max_length=150
    )

    postal_code = serializers.CharField(
        max_length=20
    )

    street_address = serializers.CharField(
        max_length=255
    )

    # --------------------------------------------------------
    # ACCOUNT
    # --------------------------------------------------------

    email = serializers.EmailField()

    contact_number = serializers.CharField(
        max_length=30
    )

    username = serializers.CharField(
        max_length=150
    )

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )

    confirm_password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )

    agree_terms = serializers.BooleanField()

    agree_certify = serializers.BooleanField()

    # --------------------------------------------------------
    # VERIFIED EMAIL TOKEN
    # --------------------------------------------------------

    verification_token = serializers.CharField(
        write_only=True
    )

    # --------------------------------------------------------
    # DOCUMENTS
    # --------------------------------------------------------

    barangay_permit = serializers.FileField()

    valid_id = serializers.FileField()

    # ========================================================
    # FIELD VALIDATION
    # ========================================================

    def validate_first_name(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "First name is required."
            )

        return value

    def validate_last_name(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Last name is required."
            )

        return value

    def validate_email(self, value):

        return value.strip().lower()

    def validate_username(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Username is required."
            )

        if len(value) < 3:
            raise serializers.ValidationError(
                "Username must contain at least 3 characters."
            )

        return value

    def validate_contact_number(self, value):

        value = value.strip()

        normalized = (
            value
            .replace(" ", "")
            .replace("-", "")
        )

        if normalized.startswith("+63"):

            normalized = (
                "0"
                + normalized[3:]
            )

        if (
            len(normalized) != 11
            or not normalized.isdigit()
            or not normalized.startswith("09")
        ):

            raise serializers.ValidationError(
                "Enter a valid Philippine mobile number."
            )

        return value

    # ========================================================
    # DOCUMENT VALIDATION
    # ========================================================

    def _validate_document(
        self,
        file,
        document_name,
    ):

        max_size = (
            5 * 1024 * 1024
        )

        if file.size > max_size:

            raise serializers.ValidationError(
                f"{document_name} must not exceed 5MB."
            )

        allowed_types = {
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
        }

        content_type = getattr(
            file,
            "content_type",
            "",
        )

        if (
            content_type
            and content_type not in allowed_types
        ):

            raise serializers.ValidationError(
                f"{document_name} must be JPG, PNG, WEBP, or PDF."
            )

        return file

    def validate_barangay_permit(
        self,
        file,
    ):

        return self._validate_document(
            file,
            "Barangay Permit",
        )

    def validate_valid_id(
        self,
        file,
    ):

        return self._validate_document(
            file,
            "Valid ID",
        )

    # ========================================================
    # COMPLETE REGISTRATION VALIDATION
    # ========================================================

    def validate(self, attrs):

        # ----------------------------------------------------
        # Password confirmation
        # ----------------------------------------------------

        if (
            attrs["password"]
            != attrs["confirm_password"]
        ):

            raise serializers.ValidationError(
                {
                    "confirm_password":
                    "Passwords do not match."
                }
            )

        password = attrs["password"]

        # ----------------------------------------------------
        # Uppercase
        # ----------------------------------------------------

        if not any(
            character.isupper()
            for character in password
        ):

            raise serializers.ValidationError(
                {
                    "password":
                    "Password must contain at least one uppercase letter."
                }
            )

        # ----------------------------------------------------
        # Lowercase
        # ----------------------------------------------------

        if not any(
            character.islower()
            for character in password
        ):

            raise serializers.ValidationError(
                {
                    "password":
                    "Password must contain at least one lowercase letter."
                }
            )

        # ----------------------------------------------------
        # Number
        # ----------------------------------------------------

        if not any(
            character.isdigit()
            for character in password
        ):

            raise serializers.ValidationError(
                {
                    "password":
                    "Password must contain at least one number."
                }
            )

        # ----------------------------------------------------
        # Special character
        # ----------------------------------------------------

        special_characters = (
            "!@#$%^&*(),.?\":{}|<>"
        )

        if not any(
            character in special_characters
            for character in password
        ):

            raise serializers.ValidationError(
                {
                    "password":
                    "Password must contain at least one special character."
                }
            )

        # ----------------------------------------------------
        # Terms
        # ----------------------------------------------------

        if not attrs.get(
            "agree_terms"
        ):

            raise serializers.ValidationError(
                {
                    "agree_terms":
                    "You must agree to the Terms of Service and Privacy Policy."
                }
            )

        # ----------------------------------------------------
        # Certification
        # ----------------------------------------------------

        if not attrs.get(
            "agree_certify"
        ):

            raise serializers.ValidationError(
                {
                    "agree_certify":
                    "You must certify that the submitted information is true and accurate."
                }
            )

        return attrs


# ============================================================
# USER LOGIN
# ============================================================

class UserLoginSerializer(serializers.Serializer):

    identifier = serializers.CharField(
        max_length=255
    )

    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate_identifier(
        self,
        value,
    ):

        value = value.strip()

        if not value:

            raise serializers.ValidationError(
                "Email or username is required."
            )

        return value


# ============================================================
# ADMIN LOGIN
# ============================================================

class AdminLoginSerializer(serializers.Serializer):

    username = serializers.CharField(
        max_length=150
    )

    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )


# ============================================================
# RETAILER ADMIN ACTION
# ============================================================

class RetailerStatusSerializer(serializers.Serializer):

    action = serializers.ChoiceField(
        choices=[
            "approve",
            "reject",
            "archive",
            "restore",
        ]
    )


# ============================================================
# FARMER — SEND OTP
# ============================================================

class FarmerSendOTPSerializer(serializers.Serializer):
    """
    Validate the request before sending
    Farmer registration OTP.

    Username is optional for Farmer.
    """

    email = serializers.EmailField()

    username = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    def validate_email(
        self,
        value,
    ):

        return (
            value
            .strip()
            .lower()
        )

    def validate_username(
        self,
        value,
    ):

        if value is None:
            return ""

        value = value.strip()

        if not value:
            return ""

        if len(value) < 3:

            raise serializers.ValidationError(
                "Username must contain at least 3 characters."
            )

        allowed = (
            all(
                character.isalnum()
                or character in "._"
                for character in value
            )
        )

        if not allowed:

            raise serializers.ValidationError(
                "Username may contain only letters, "
                "numbers, dots, and underscores."
            )

        return value


# ============================================================
# FARMER — VERIFY OTP
# ============================================================

class FarmerVerifyOTPSerializer(serializers.Serializer):
    """
    Validate Farmer email + 6-digit OTP.
    """

    email = serializers.EmailField()

    otp = serializers.RegexField(
        regex=r"^\d{6}$",
        error_messages={
            "invalid":
            "OTP must contain exactly 6 digits."
        },
    )

    def validate_email(
        self,
        value,
    ):

        return (
            value
            .strip()
            .lower()
        )


# ============================================================
# FARMER REGISTRATION
# ============================================================

class FarmerRegistrationSerializer(serializers.Serializer):
    """
    Complete Farmer registration payload.

    Contains:

        Step 1 — Personal Information
        Step 2 — Verification Token
        Step 3 — Farm Information
        Step 4 — RSBSA Compliance
    """

    # ========================================================
    # STEP 1 — PERSONAL INFORMATION
    # ========================================================

    first_name = serializers.CharField(
        max_length=100
    )

    middle_initial = serializers.CharField(
        max_length=10,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    last_name = serializers.CharField(
        max_length=100
    )

    suffix = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    gender = serializers.CharField(
        max_length=50
    )

    # ========================================================
    # STEP 1 — HOME ADDRESS
    # ========================================================

    province = serializers.CharField(
        max_length=150
    )

    municipality = serializers.CharField(
        max_length=150
    )

    barangay = serializers.CharField(
        max_length=150
    )

    postal_code = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    street_address = serializers.CharField(
        max_length=255
    )

    # ========================================================
    # STEP 1 — ACCOUNT INFORMATION
    # ========================================================

    email = serializers.EmailField()

    contact_number = serializers.CharField(
        max_length=30
    )

    # Farmer username is OPTIONAL.
    username = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )

    confirm_password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )

    agree_terms = serializers.BooleanField()

    # ========================================================
    # STEP 2 — EMAIL VERIFICATION
    # ========================================================

    verification_token = serializers.CharField(
        write_only=True
    )

    # ========================================================
    # STEP 3 — FARM INFORMATION
    # ========================================================

    farm_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    farm_province = serializers.CharField(
        max_length=150
    )

    farm_municipality = serializers.CharField(
        max_length=150
    )

    farm_barangay = serializers.CharField(
        max_length=150
    )

    farm_postal_code = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    farm_street_address = serializers.CharField(
        max_length=255
    )

    total_farm_area = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=0.01,
    )

    land_ownership_status = serializers.ChoiceField(
        choices=[
            "owned",
            "leased",
            "tenant",
            "shared",
            "other",
        ]
    )

    rice_variety_currently_planted = serializers.CharField(
        max_length=100
    )

    cropping_cycles_per_year = serializers.IntegerField(
        min_value=1,
    )

    # ========================================================
    # STEP 4 — RSBSA COMPLIANCE
    # ========================================================

    submission_method = serializers.ChoiceField(
        choices=[
            "upload",
            "manual",
        ]
    )

    rsbsa_number = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    rsbsa_document = serializers.FileField(
        required=False,
        allow_null=True,
    )

    agree_certify = serializers.BooleanField()

    # ========================================================
    # PERSONAL INFORMATION VALIDATION
    # ========================================================

    def validate_first_name(
        self,
        value,
    ):

        value = value.strip()

        if not value:

            raise serializers.ValidationError(
                "First name is required."
            )

        if any(
            character.isdigit()
            for character in value
        ):

            raise serializers.ValidationError(
                "First name must not contain numbers."
            )

        return value

    def validate_middle_initial(
        self,
        value,
    ):

        if value is None:
            return ""

        value = value.strip()

        if not value:
            return ""

        if any(
            character.isdigit()
            for character in value
        ):

            raise serializers.ValidationError(
                "Middle initial must not contain numbers."
            )

        return value

    def validate_last_name(
        self,
        value,
    ):

        value = value.strip()

        if not value:

            raise serializers.ValidationError(
                "Last name is required."
            )

        if any(
            character.isdigit()
            for character in value
        ):

            raise serializers.ValidationError(
                "Last name must not contain numbers."
            )

        return value

    def validate_suffix(
        self,
        value,
    ):

        if value is None:
            return ""

        return value.strip()

    # ========================================================
    # ADDRESS VALIDATION
    # ========================================================

    def validate_province(
        self,
        value,
    ):

        value = value.strip()

        if not value:

            raise serializers.ValidationError(
                "Province is required."
            )

        return value

    def validate_municipality(
        self,
        value,
    ):

        value = value.strip()

        if not value:

            raise serializers.ValidationError(
                "Municipality/City is required."
            )

        return value

    def validate_barangay(
        self,
        value,
    ):

        value = value.strip()

        if not value:

            raise serializers.ValidationError(
                "Barangay is required."
            )

        return value

    def validate_postal_code(
        self,
        value,
    ):
        """
        Postal code remains optional because
        some Philippine location records may not
        automatically return a postal code.

        When supplied, it must contain 4 digits.
        """

        if value is None:
            return ""

        value = str(
            value
        ).strip()

        if not value:
            return ""

        if (
            len(value) != 4
            or not value.isdigit()
        ):

            raise serializers.ValidationError(
                "Postal code must contain exactly 4 digits."
            )

        return value

    def validate_street_address(
        self,
        value,
    ):

        value = value.strip()

        if not value:

            raise serializers.ValidationError(
                "Street address is required."
            )

        return value

    # ========================================================
    # ACCOUNT VALIDATION
    # ========================================================

    def validate_email(
        self,
        value,
    ):

        return (
            value
            .strip()
            .lower()
        )

    def validate_contact_number(
        self,
        value,
    ):

        value = value.strip()

        normalized = (
            value
            .replace(" ", "")
            .replace("-", "")
        )

        if normalized.startswith(
            "+63"
        ):

            normalized = (
                "0"
                + normalized[3:]
            )

        if (
            len(normalized) != 11
            or not normalized.isdigit()
            or not normalized.startswith("09")
        ):

            raise serializers.ValidationError(
                "Enter a valid Philippine mobile number."
            )

        # Standardize before passing to PostgreSQL.
        return normalized

    def validate_username(
        self,
        value,
    ):

        if value is None:
            return ""

        value = value.strip()

        # Farmer username is optional.
        if not value:
            return ""

        if len(value) < 3:

            raise serializers.ValidationError(
                "Username must contain at least 3 characters."
            )

        allowed = (
            all(
                character.isalnum()
                or character in "._"
                for character in value
            )
        )

        if not allowed:

            raise serializers.ValidationError(
                "Username may contain only letters, "
                "numbers, dots, and underscores."
            )

        return value

    def validate_password(
        self,
        value,
    ):

        # ----------------------------------------------------
        # Uppercase
        # ----------------------------------------------------

        if not any(
            character.isupper()
            for character in value
        ):

            raise serializers.ValidationError(
                "Password must contain at least "
                "one uppercase letter."
            )

        # ----------------------------------------------------
        # Lowercase
        # ----------------------------------------------------

        if not any(
            character.islower()
            for character in value
        ):

            raise serializers.ValidationError(
                "Password must contain at least "
                "one lowercase letter."
            )

        # ----------------------------------------------------
        # Number
        # ----------------------------------------------------

        if not any(
            character.isdigit()
            for character in value
        ):

            raise serializers.ValidationError(
                "Password must contain at least one number."
            )

        # ----------------------------------------------------
        # Special Character
        # ----------------------------------------------------

        special_characters = (
            "!@#$%^&*(),.?\":{}|<>"
        )

        if not any(
            character in special_characters
            for character in value
        ):

            raise serializers.ValidationError(
                "Password must contain at least "
                "one special character."
            )

        return value

    # ========================================================
    # FARM INFORMATION VALIDATION
    # ========================================================

    def validate_farm_name(
        self,
        value,
    ):

        if value is None:
            return ""

        return value.strip()

    def validate_farm_province(
        self,
        value,
    ):

        value = value.strip()

        if not value:

            raise serializers.ValidationError(
                "Farm province is required."
            )

        return value

    def validate_farm_municipality(
        self,
        value,
    ):

        value = value.strip()

        if not value:

            raise serializers.ValidationError(
                "Farm municipality is required."
            )

        return value

    def validate_farm_barangay(
        self,
        value,
    ):

        value = value.strip()

        if not value:

            raise serializers.ValidationError(
                "Farm barangay is required."
            )

        return value

    def validate_farm_postal_code(
        self,
        value,
    ):

        if value is None:
            return ""

        value = str(
            value
        ).strip()

        if not value:
            return ""

        if (
            len(value) != 4
            or not value.isdigit()
        ):

            raise serializers.ValidationError(
                "Farm postal code must contain exactly 4 digits."
            )

        return value

    def validate_farm_street_address(
        self,
        value,
    ):

        value = value.strip()

        if not value:

            raise serializers.ValidationError(
                "Farm street address is required."
            )

        return value

    def validate_rice_variety_currently_planted(
        self,
        value,
    ):

        value = value.strip()

        if not value:

            raise serializers.ValidationError(
                "Rice variety currently planted is required."
            )

        return value

    # ========================================================
    # RSBSA DOCUMENT VALIDATION
    # ========================================================

    def validate_rsbsa_document(
        self,
        file,
    ):

        if file is None:
            return None

        # Farmer RSBSA limit:
        # 10 MB
        max_size = (
            10 * 1024 * 1024
        )

        if file.size > max_size:

            raise serializers.ValidationError(
                "RSBSA document must not exceed 10MB."
            )

        allowed_types = {
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
        }

        content_type = getattr(
            file,
            "content_type",
            "",
        )

        if (
            content_type
            and content_type not in allowed_types
        ):

            raise serializers.ValidationError(
                "RSBSA document must be "
                "JPG, JPEG, PNG, WEBP, or PDF."
            )

        filename = (
            getattr(
                file,
                "name",
                "",
            )
            or ""
        ).lower()

        allowed_extensions = (
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".pdf",
        )

        if (
            filename
            and not filename.endswith(
                allowed_extensions
            )
        ):

            raise serializers.ValidationError(
                "RSBSA document must be "
                "JPG, JPEG, PNG, WEBP, or PDF."
            )

        return file

    # ========================================================
    # COMPLETE FARMER REGISTRATION VALIDATION
    # ========================================================

    def validate(
        self,
        attrs,
    ):

        # ----------------------------------------------------
        # Password confirmation
        # ----------------------------------------------------

        if (
            attrs["password"]
            != attrs["confirm_password"]
        ):

            raise serializers.ValidationError(
                {
                    "confirm_password":
                    "Passwords do not match."
                }
            )

        # ----------------------------------------------------
        # Terms
        # ----------------------------------------------------

        if not attrs.get(
            "agree_terms"
        ):

            raise serializers.ValidationError(
                {
                    "agree_terms":
                    "You must agree to the Terms "
                    "of Service and Privacy Policy."
                }
            )

        # ----------------------------------------------------
        # RSBSA submission method
        # ----------------------------------------------------

        submission_method = (
            attrs.get(
                "submission_method"
            )
        )

        rsbsa_number = (
            str(
                attrs.get(
                    "rsbsa_number"
                )
                or ""
            )
            .strip()
        )

        rsbsa_document = (
            attrs.get(
                "rsbsa_document"
            )
        )

        # ----------------------------------------------------
        # MANUAL
        # ----------------------------------------------------

        if (
            submission_method
            == "manual"
        ):

            if not rsbsa_number:

                raise serializers.ValidationError(
                    {
                        "rsbsa_number":
                        "RSBSA Registration Number is required."
                    }
                )

            if rsbsa_document:

                raise serializers.ValidationError(
                    {
                        "rsbsa_document":
                        "Do not upload an RSBSA document "
                        "when manual entry is selected."
                    }
                )

        # ----------------------------------------------------
        # UPLOAD
        # ----------------------------------------------------

        elif (
            submission_method
            == "upload"
        ):

            if not rsbsa_document:

                raise serializers.ValidationError(
                    {
                        "rsbsa_document":
                        "Please upload your RSBSA ID/photo."
                    }
                )

            # RSBSA number can remain blank.
            # OCR may fill this later.

        # ----------------------------------------------------
        # Certification
        # ----------------------------------------------------

        if not attrs.get(
            "agree_certify"
        ):

            raise serializers.ValidationError(
                {
                    "agree_certify":
                    "You must certify that the submitted "
                    "information is true and accurate."
                }
            )

        # Clean optional RSBSA number.
        attrs["rsbsa_number"] = (
            rsbsa_number
        )

        return attrs