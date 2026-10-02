from django.db import models
from django.utils import timezone


class User(models.Model):
    """
    Django mapping for GrainRise's EXISTING centralized PostgreSQL `users` table.

    IMPORTANT:
    managed = False means Django will NOT create, alter, or migrate this table.
    """

    user_id = models.BigIntegerField(primary_key=True)

    class Meta:
        managed = False
        db_table = "users"

    def __str__(self):
        return f"User {self.user_id}"


class RetailerDocument(models.Model):
    """
    Django mapping for the EXISTING PostgreSQL `retailer_documents` table.

    Django will NOT create or migrate this table.
    """

    user_id = models.BigIntegerField(primary_key=True)

    class Meta:
        managed = False
        db_table = "retailer_documents"

    def __str__(self):
        return f"Retailer documents for user {self.user_id}"


# ============================================================
# EXISTING GRAINRISE MODELS
# ============================================================

class Silo(models.Model):
    name = models.CharField(max_length=100)
    grain_type = models.CharField(max_length=50)
    capacity = models.FloatField()
    current_stock = models.FloatField()
    temperature = models.FloatField()
    humidity = models.FloatField()
    moisture = models.FloatField()
    last_updated = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


class Alert(models.Model):
    silo_id = models.IntegerField()
    alert_type = models.CharField(max_length=100)
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.alert_type} for Silo {self.silo_id}"

import uuid


class PartnershipInquiry(models.Model):
    """
    Dedicated model for public Partnership Inquiries submitted via the Partner With Us form.

    Inquiries are routed to the appropriate Management module based on partner_role:
      - miller   -> Miller Management (To Review tab)
      - warehouse -> Warehouse Management (To Review tab)
      - retailer  -> Retailer Management (To Review tab)

    Statuses mirror the Management module workflow:
      - to_review : newly submitted, awaiting admin review
      - active    : inquiry acknowledged / applicant being onboarded
      - inactive  : archived / closed
    """

    class PartnerRole(models.TextChoices):
        MILLER = "miller", "Miller / Supplier"
        WAREHOUSE = "warehouse", "Warehouse Manager"
        RETAILER = "retailer", "Retailer"

    class Status(models.TextChoices):
        TO_REVIEW = "to_review", "To Review"
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    partnership_inquiry_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    name = models.CharField(max_length=255)
    email = models.EmailField(max_length=255)
    organization_company = models.CharField(max_length=255)
    partner_role = models.CharField(
        max_length=50,
        choices=PartnerRole.choices,
        default=PartnerRole.RETAILER,
    )
    contact_number = models.CharField(max_length=20)
    message = models.TextField(max_length=2000)

    # Relative path in MEDIA_ROOT: partnership_documents/<uuid>/<safe_filename>
    government_issued_id = models.TextField(
        blank=True,
        null=True,
        help_text='Stored path of uploaded government-issued ID',
    )
    business_verification_document = models.TextField(
        blank=True,
        null=True,
        help_text='Stored path or JSON array of uploaded document paths',
    )

    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.TO_REVIEW,
    )

    email_verified = models.BooleanField(default=False)

    # SHA-256 hash of raw verification token
    verification_token_hash = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        db_index=True,
    )

    verification_expires_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    verified_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    resend_count = models.PositiveSmallIntegerField(default=0)
    last_resend_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "partnership_inquiries"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.organization_company}) - {self.partner_role} - {self.status}"
