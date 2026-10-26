"""Django settings for the GrainRise backend."""



from pathlib import Path

import os




from django.core.exceptions import ImproperlyConfigured





# ============================================================

# BASE DIRECTORY

# ============================================================



BASE_DIR = Path(__file__).resolve().parent.parent





# ============================================================

# LOAD backend/.env

# ============================================================



def _load_env_file(path: Path) -> None:

    """

    Load environment variables from backend/.env.



    This avoids requiring python-dotenv and preserves the

    existing GrainRise .env file.

    """

    if not path.exists():

        return



    for raw_line in path.read_text(encoding="utf-8").splitlines():

        line = raw_line.strip()



        if not line:

            continue



        if line.startswith("#"):

            continue



        if "=" not in line:

            continue



        key, value = line.split("=", 1)



        key = key.strip()

        value = value.strip()



        # Remove optional surrounding quotes.

        if (

            len(value) >= 2

            and value[0] == value[-1]

            and value[0] in {'"', "'"}

        ):

            value = value[1:-1]



        # For local GrainRise development, backend/.env is the

        # authoritative configuration file.  Overwrite any stale value

        # inherited by Django's autoreloader/terminal so editing .env

        # actually takes effect after the server restarts.

        os.environ.setdefault(key, value)





_load_env_file(BASE_DIR / ".env")





# ============================================================

# CORE DJANGO SETTINGS

# ============================================================



SECRET_KEY = (

    os.getenv("DJANGO_SECRET_KEY")

    or os.getenv("JWT_SECRET")

    or "django-insecure-grainrise-development-key"

)



DEBUG = os.getenv(

    "DEBUG",

    "true",

).strip().lower() in {

    "1",

    "true",

    "yes",

    "on",

}



ALLOWED_HOSTS = [

    host.strip()

    for host in os.getenv(

        "ALLOWED_HOSTS",

        "*",

    ).split(",")

    if host.strip()

]





# ============================================================

# APPLICATIONS

# ============================================================



INSTALLED_APPS = [

    "django.contrib.admin",

    "django.contrib.auth",

    "django.contrib.contenttypes",

    "django.contrib.sessions",

    "django.contrib.messages",

    "django.contrib.staticfiles",



    "rest_framework",

    "corsheaders",



    "api.apps.ApiConfig",

]





# ============================================================

# MIDDLEWARE

# ============================================================



MIDDLEWARE = [

    "django.middleware.security.SecurityMiddleware",



    "django.contrib.sessions.middleware.SessionMiddleware",



    # CORS should come before CommonMiddleware.

    "corsheaders.middleware.CorsMiddleware",



    "django.middleware.common.CommonMiddleware",

    "django.middleware.csrf.CsrfViewMiddleware",



    "django.contrib.auth.middleware.AuthenticationMiddleware",

    "django.contrib.messages.middleware.MessageMiddleware",



    "django.middleware.clickjacking.XFrameOptionsMiddleware",

]





# ============================================================

# FRONTEND / CORS

# ============================================================



FRONTEND_URL = os.getenv(

    "FRONTEND_URL",

    "http://localhost:5173",

).rstrip("/")



CORS_ALLOWED_ORIGINS = list(

    dict.fromkeys(

        [

            FRONTEND_URL,

            "http://localhost:5173",

            "http://127.0.0.1:5173",

        ]

    )

)



CORS_ALLOW_CREDENTIALS = True





CSRF_TRUSTED_ORIGINS = list(

    dict.fromkeys(

        [

            FRONTEND_URL,

            "http://localhost:5173",

            "http://127.0.0.1:5173",

        ]

    )

)





# ============================================================

# URL / TEMPLATE / WSGI

# ============================================================



ROOT_URLCONF = "grainrise_project.urls"



TEMPLATES = [

    {

        "BACKEND": "django.template.backends.django.DjangoTemplates",

        "DIRS": [],

        "APP_DIRS": True,

        "OPTIONS": {

            "context_processors": [

                "django.template.context_processors.request",

                "django.contrib.auth.context_processors.auth",

                "django.contrib.messages.context_processors.messages",

            ],

        },

    },

]



WSGI_APPLICATION = "grainrise_project.wsgi.application"





# ============================================================
# MYSQL DATABASE
# ============================================================
#
# GrainRise revised core database:
#   grainrise_capstone
#
# Database configuration is read from backend/.env.
# There is intentionally NO SQLite or PostgreSQL fallback.
#
# Required backend/.env variables:
#   DB_NAME
#   DB_USER
#   DB_PASSWORD
#   DB_HOST
#   DB_PORT
# ============================================================

required_database_variables = [
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
    "DB_HOST",
    "DB_PORT",
]

missing_database_variables = [
    variable
    for variable in required_database_variables
    if not os.getenv(variable)
]

if missing_database_variables:
    raise ImproperlyConfigured(
        "GrainRise MySQL configuration is incomplete. "
        "Missing environment variable(s): "
        + ", ".join(missing_database_variables)
        + ". Check backend/.env."
    )

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST"),
        "PORT": os.getenv("DB_PORT"),
        "CONN_MAX_AGE": 600,
        "CONN_HEALTH_CHECKS": True,
        "OPTIONS": {
            "charset": "utf8mb4",
            "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
            "ssl": {},
        },
    }
}


# ============================================================

# DJANGO PASSWORD VALIDATORS

# ============================================================



AUTH_PASSWORD_VALIDATORS = [

    {

        "NAME":

            "django.contrib.auth.password_validation."

            "UserAttributeSimilarityValidator"

    },

    {

        "NAME":

            "django.contrib.auth.password_validation."

            "MinimumLengthValidator"

    },

    {

        "NAME":

            "django.contrib.auth.password_validation."

            "CommonPasswordValidator"

    },

    {

        "NAME":

            "django.contrib.auth.password_validation."

            "NumericPasswordValidator"

    },

]





# ============================================================

# LOCALIZATION

# ============================================================



LANGUAGE_CODE = "en-us"



TIME_ZONE = "Asia/Manila"



USE_I18N = True



USE_TZ = True





# ============================================================

# STATIC / UPLOADED FILES

# ============================================================



STATIC_URL = "static/"



MEDIA_URL = "/media/"



MEDIA_ROOT = BASE_DIR / "media"



DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"





# ============================================================

# EMAIL / GMAIL SMTP

# ============================================================

#

# Uses the EXISTING variables inside backend/.env:

#

# EMAIL_HOST

# EMAIL_PORT

# EMAIL_SECURE

# EMAIL_USER

# EMAIL_APP_PASSWORD

# EMAIL_FROM_NAME

#

# Do NOT put your Gmail password directly in this file.

# ============================================================



EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"



EMAIL_HOST = os.getenv(

    "EMAIL_HOST",

    "smtp.gmail.com",

)



EMAIL_PORT = int(

    os.getenv(

        "EMAIL_PORT",

        "587",

    )

)



EMAIL_HOST_USER = os.getenv(

    "EMAIL_USER",

    "",

)



# Google displays App Passwords in four groups for readability.

# SMTP expects the actual 16-character value, so remove all whitespace

# automatically. This also makes copy/paste from Google Account safe.

EMAIL_HOST_PASSWORD = "".join(

    os.getenv(

        "EMAIL_APP_PASSWORD",

        "",

    ).split()

)



EMAIL_FROM_NAME = os.getenv(

    "EMAIL_FROM_NAME",

    "GrainRise",

)





# Your existing .env uses EMAIL_SECURE.

#

# For Gmail:

# EMAIL_PORT=587 + EMAIL_SECURE=false

# results in TLS.

#

# EMAIL_PORT=465 + EMAIL_SECURE=true

# results in SSL.



EMAIL_SECURE = os.getenv(

    "EMAIL_SECURE",

    "false",

).strip().lower() in {

    "1",

    "true",

    "yes",

    "on",

}





if EMAIL_PORT == 465:



    EMAIL_USE_SSL = True

    EMAIL_USE_TLS = False



else:



    EMAIL_USE_SSL = False

    EMAIL_USE_TLS = True





EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", 8))





if EMAIL_HOST_USER:



    DEFAULT_FROM_EMAIL = (

        f"{EMAIL_FROM_NAME} <{EMAIL_HOST_USER}>"

    )



else:



    DEFAULT_FROM_EMAIL = (

        "GrainRise <no-reply@grainrise.local>"

    )





# ============================================================

# TEMPORARY OTP STORAGE

# ============================================================

#

# OTP does NOT need another MySQL table.

#

# For the current development environment, Django's local-memory

# cache stores the OTP temporarily.

#

# Later, Redis can replace this for production/multiple servers

# without changing the registration UI.

# ============================================================



CACHES = {

    "default": {

        "BACKEND":

            "django.core.cache.backends.locmem.LocMemCache",



        "LOCATION":

            "grainrise-retailer-registration",

    }

}





# ============================================================

# DJANGO REST FRAMEWORK

# ============================================================



REST_FRAMEWORK = {

    "DEFAULT_RENDERER_CLASSES": [

        "rest_framework.renderers.JSONRenderer",

    ],

}


