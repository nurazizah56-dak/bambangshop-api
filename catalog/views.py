"""API views and viewsets for catalog application."""

from django.shortcuts import render
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from catalog.models import Category, Product
from catalog.serializers import CategorySerializer, ProductSerializer
from catalog.permissions import IsOwnerOrReadOnly

# =============================================================================
# Milestone 2: Implement CategoryViewSet and ProductViewSet
# =============================================================================
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().select_related('category')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
# =============================================================================
# Milestone 3: Attach Filtering and Search to ProductViewSet 
# =============================================================================
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category']
    search_fields = ['name', 'sku']
    ordering_fields = ['price', 'created_at']

    # --- Fitur Milestone 2 (Assign Owner saat membuat produk) ---
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    # --- Fitur Milestone 3 (Custom Action Restock) ---
    @action(detail=True, methods=['post'])
    def restock(self, request, pk=None):
        product = self.get_object()
        amount = int(request.data.get('amount', 5))
        product.stock += amount
        product.save()
        return Response(ProductSerializer(product).data)
    
# =============================================================================
# Milestone 4: Frontend View
# =============================================================================
def product_list_page(request):
    return render(request, 'catalog/product_list.html')