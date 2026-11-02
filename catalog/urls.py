"""URL routing configuration for catalog API."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from catalog.views import CategoryViewSet, ProductViewSet, product_list_page

# =============================================================================
# Milestone 2: Register ViewSets with DefaultRouter
# =============================================================================
router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')

urlpatterns = [
    # Milestone 4: Route product_list_page at root path
    path('', product_list_page, name='product-list-page'),

    # Milestone 2: Wire router endpoints under api/v1/ prefix
    path('api/v1/', include(router.urls)),
]
