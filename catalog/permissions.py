"""Custom permission classes for catalog application."""

from rest_framework import permissions

# =============================================================================
# Milestone 2: Define IsOwnerOrReadOnly custom permission class
# =============================================================================
class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit or delete it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions (GET, HEAD, OPTIONS) diizinkan untuk siapa saja
        if request.method in permissions.SAFE_METHODS:
            return True

        # Modifikasi (PUT, PATCH, DELETE) hanya diizinkan untuk owner objek tersebut
        return obj.owner == request.user