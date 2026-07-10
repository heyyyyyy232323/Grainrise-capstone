from django.urls import path
from . import views

urlpatterns = [
    path('', views.read_root, name='root'),
    path('api/auth/register', views.register, name='register'),
    path('api/auth/login', views.login, name='login'),
    path('api/silos', views.silos_list, name='silos_list'),
    path('api/silos/<int:silo_id>', views.update_silo, name='update_silo'),
    path('api/alerts', views.alerts_list, name='alerts_list'),
    path('api/alerts/<int:alert_id>', views.resolve_alert, name='resolve_alert'),
]
