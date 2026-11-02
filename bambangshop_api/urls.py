"""URL configuration for bambangshop_api project."""

from django.contrib import admin
from django.urls import path, include

# Milestone 3: Import Spectacular API views and obtain_auth_token
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include('authentication.urls')),

    # Milestone 3: Wire OpenAPI schema and documentation endpoints
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/v1/auth/token/', obtain_auth_token, name='api_token_auth'),

    # Milestone 4: Route catalog application at the root path
    path('', include('catalog.urls')),
]
