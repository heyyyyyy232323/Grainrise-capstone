import logging
import secrets
import smtplib
import string
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.mail import EmailMultiAlternatives
from django.db import connection, transaction
from django.utils.html import escape

from ..models import PartnershipInquiry

logger = logging.getLogger(__name__)

ROLE_CONFIG = {
    'miller': {
        'user_role': 'miller_manager',
        'title': 'Miller / Supplier',
    },
    'warehouse': {
        'user_role': 'warehouse_manager',
        'title': 'Warehouse Manager',
    },
    'retailer': {
        'user_role': 'retailer',
        'title': 'Retailer',
    },
}

def generate_temporary_password(length=12):
    uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    lowercase = 'abcdefghijkmnopqrstuvwxyz'
    digits = '23456789'
    symbols = '!@#$%&*?'
    all_chars = uppercase + lowercase + digits + symbols
    while True:
        pw = ''.join(secrets.choice(all_chars) for _ in range(length))
        if (any(c in uppercase for c in pw) and
            any(c in lowercase for c in pw) and
            any(c in digits for c in pw) and
            any(c in symbols for c in pw)):
            return pw

def send_partner_credentials_email(name, email, temp_password, role_title):
    frontend_base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    login_url = f'{frontend_base}/login'

    subject = f'Your GrainRise {role_title} Account Credentials'

    text_content = f"""Hello {name},

Your partnership application as a {role_title} on GrainRise has been reviewed and APPROVED!

An account has been created for you with the following credentials:
Login Email: {email}
Temporary Password: {temp_password}

Login Page: {login_url}

IMPORTANT SECURITY NOTICES:
1. You will be required to change this temporary password immediately upon your first login.
2. Missing profile and address information must be completed before accessing your full dashboard.

Thank you for partnering with GrainRise.

GrainRise Administration Team"""
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GrainRise Partnership Approved</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 40px 16px;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02); border: 1px solid #e2e8f0;">
                        <!-- Header Banner -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #064e1e 0%, #0f7634 100%); padding: 36px 32px 32px 32px; text-align: center;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                        <td align="center">
                                            <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 8px 16px; border-radius: 30px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.25);">
                                                <span style="font-size: 11px; font-weight: 700; color: #fef08a; text-transform: uppercase; letter-spacing: 1.5px;">Partnership Approved</span>
                                            </div>
                                            <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">GrainRise</h1>
                                            <p style="margin: 6px 0 0 0; font-size: 13px; color: #bbf7d0; font-weight: 500;">Agricultural Supply & Distribution Platform</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Body Content -->
                        <tr>
                            <td style="padding: 36px 32px 28px 32px;">
                                <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                                    Welcome aboard, {escape(name)}!
                                </h2>
                                <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                                    We are pleased to inform you that your partnership application as a <strong style="color: #065f46; font-weight: 700;">{escape(role_title)}</strong> has been officially approved. Your GrainRise partner account has been created and activated.
                                </p>

                                <!-- Credentials Card -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 24px 0; overflow: hidden;">
                                    <tr>
                                        <td style="background-color: #f1f5f9; padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">
                                            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #475569;">Your Login Credentials</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 20px;">
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                <tr>
                                                    <td style="padding-bottom: 14px;">
                                                        <span style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px;">Login Email Address</span>
                                                        <span style="font-size: 15px; font-weight: 700; color: #0f172a;">{escape(email)}</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                                                        <span style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 6px;">Temporary Password</span>
                                                        <div style="display: inline-block; background-color: #ecfdf5; border: 1.5px solid #a7f3d0; padding: 8px 16px; border-radius: 8px;">
                                                            <code style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 16px; font-weight: 800; color: #065f46; letter-spacing: 2px;">{escape(temp_password)}</code>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Required Actions Notice Box -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 24px 0;">
                                    <tr>
                                        <td style="padding: 16px 20px;">
                                            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #92400e;">
                                                &#9888; Required Steps Upon First Login:
                                            </p>
                                            <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #78350f;">
                                                <li style="margin-bottom: 4px;"><strong>Password Change:</strong> You must replace this temporary password with a strong permanent password immediately upon logging in.</li>
                                                <li><strong>Profile & Verification:</strong> You will be prompted to complete any remaining personal, address, and documentation details before accessing your full dashboard.</li>
                                            </ul>
                                        </td>
                                    </tr>
                                </table>

                                <!-- CTA Button -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0 20px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="{login_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #08511f 0%, #0d6e2c 100%); color: #ffffff; text-decoration: none; padding: 14px 38px; border-radius: 10px; font-size: 15px; font-weight: 700; letter-spacing: 0.2px; box-shadow: 0 4px 12px rgba(8, 81, 31, 0.35); text-align: center;">
                                                Log In to Your Account &rarr;
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin: 16px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
                                    Or copy and paste this link into your browser:<br>
                                    <a href="{login_url}" style="color: #08511f; word-break: break-all; text-decoration: underline;">{login_url}</a>
                                </p>
                            </td>
                        </tr>

                        <!-- Security Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                                <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b; font-weight: 600;">
                                    Security Reminder: GrainRise staff will never ask for your password.
                                </p>
                                <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                                    If you did not submit a partnership application with GrainRise, please disregard this email or contact support.<br>
                                    &copy; 2026 GrainRise Platform. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    message = EmailMultiAlternatives(
        subject,
        text_content,
        settings.DEFAULT_FROM_EMAIL,
        [email],
    )
    message.attach_alternative(html_content, "text/html")

    try:
        sent_count = message.send(fail_silently=False)
        return sent_count > 0, None
    except smtplib.SMTPAuthenticationError as exc:
        err = "Gmail SMTP authentication error. Check Google App Password settings."
        logger.exception(err)
        return False, err
    except Exception as exc:
        logger.exception("Failed to send credential email: %s", exc)
        return False, str(exc)

def create_partner_user_from_inquiry(inquiry_id, expected_role):
    try:
        inquiry = PartnershipInquiry.objects.get(partnership_inquiry_id=inquiry_id)
    except Exception:
        raise ValueError('Partnership inquiry was not found.')

    partner_role = str(inquiry.partner_role or '').strip().lower()
    if partner_role != expected_role:
        raise ValueError(f'Inquiry role ({partner_role}) does not match expected role ({expected_role}).')

    if inquiry.status == 'active':
        raise ValueError('This partnership inquiry has already been confirmed and activated.')

    # Check if a user with this email already exists
    with connection.cursor() as cursor:
        cursor.execute('SELECT user_id, user_role::text, status::text FROM users WHERE LOWER(email) = %s', [inquiry.email.lower()])
        existing_user = cursor.fetchone()

    if existing_user:
        raise ValueError(f'An account with email {inquiry.email} already exists (User ID: {existing_user[0]}).')

    config = ROLE_CONFIG.get(partner_role)
    if not config:
        raise ValueError(f'Invalid partner role: {partner_role}')

    user_role = config['user_role']
    role_title = config['title']

    temp_password = generate_temporary_password(12)
    hashed_password = make_password(temp_password)

    name_parts = str(inquiry.name or '').strip().split()
    first_name = name_parts[0] if name_parts else 'Partner'
    last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else 'Applicant'

    base_username = (inquiry.email.split('@')[0])[:20]
    with connection.cursor() as cursor:
        cursor.execute('SELECT COUNT(*) FROM users WHERE username = %s', [base_username])
        if cursor.fetchone()[0] > 0:
            base_username = f'{base_username}_{secrets.token_hex(3)}'

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute('''
                INSERT INTO users (
                    first_name, middle_initial, last_name, suffix, gender,
                    province, municipality, postal_code, barangay, street_address,
                    email, contact_number, username, password_hash, user_role,
                    status, must_change_password, created_at, updated_at
                ) VALUES (
                    %s, NULL, %s, NULL, NULL,
                    NULL, NULL, NULL, NULL, NULL,
                    %s, %s, %s, %s, %s::user_role_enum,
                    'active'::user_status_enum, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                ) RETURNING user_id, status::text, updated_at
            ''', [
                first_name,
                last_name,
                inquiry.email.strip().lower(),
                inquiry.contact_number or '',
                base_username,
                hashed_password,
                user_role,
            ])
            row = cursor.fetchone()
            created_user_id = row[0]
            status_text = row[1]
            updated_at = row[2]

            doc_path = inquiry.business_verification_document or None
            org_name = inquiry.organization_company or None

            if partner_role == 'miller':
                cursor.execute('''
                    INSERT INTO supplier_profiles (
                        user_id, business_name, organization_name,
                        province, municipality, postal_code, barangay, street_address,
                        official_email, official_contact_number, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s,
                        NULL, NULL, NULL, NULL, NULL,
                        %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                ''', [
                    created_user_id,
                    org_name or inquiry.name,
                    org_name,
                    inquiry.email,
                    inquiry.contact_number or '',
                ])

                cursor.execute('''
                    INSERT INTO supplier_documents (
                        user_id, government_issued_id, business_permit, business_registration, milling_license,
                        created_at, updated_at
                    ) VALUES (
                        %s, NULL, NULL, %s, NULL,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                ''', [
                    created_user_id,
                    doc_path,
                ])

            elif partner_role == 'warehouse':
                cursor.execute('''
                    INSERT INTO warehouse_profiles (
                        user_id, business_name, organization_name,
                        province, municipality, postal_code, barangay, street_address,
                        official_email, official_contact_number, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s,
                        NULL, NULL, NULL, NULL, NULL,
                        %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                ''', [
                    created_user_id,
                    org_name or inquiry.name,
                    org_name,
                    inquiry.email,
                    inquiry.contact_number or '',
                ])

                cursor.execute('''
                    INSERT INTO warehouse_documents (
                        user_id, government_issued_id, business_permit, business_registration, warehouse_license,
                        created_at, updated_at
                    ) VALUES (
                        %s, NULL, NULL, %s, NULL,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                ''', [
                    created_user_id,
                    doc_path,
                ])

            elif partner_role == 'retailer':
                cursor.execute('''
                    INSERT INTO retailer_documents (
                        user_id, barangay_permit, valid_id,
                        created_at, updated_at
                    ) VALUES (
                        %s, NULL, %s,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                ''', [
                    created_user_id,
                    doc_path,
                ])

        inquiry.status = PartnershipInquiry.Status.ACTIVE
        inquiry.save(update_fields=['status', 'updated_at'])

    email_sent, email_error = send_partner_credentials_email(
        name=inquiry.name,
        email=inquiry.email,
        temp_password=temp_password,
        role_title=role_title,
    )

    return {
        'message': f'{role_title} account created and credentials emailed successfully.',
        'user_id': created_user_id,
        'status': status_text,
        'updated_at': updated_at,
        'email_sent': email_sent,
        'email_error': email_error,
    }
