/**
 * BambangShop Catalog Client-Side JavaScript Template (Milestone 4)
 * Focus: Implement AJAX (Fetch API) communication with Django REST Framework backend.
 */

const BASE_PRODUCTS_ENDPOINT = "/api/v1/products/";
const BASE_CATEGORIES_ENDPOINT = "/api/v1/categories/";

let productsAbortController;
let searchDebounceTimer;

// =============================================================================
// Provided UI Helper Utilities
// =============================================================================

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

function displayPageSection({ showLoading = false, showError = false, showEmpty = false, showGrid = false }) {
    const loadingState = document.getElementById('loading');
    const errorState = document.getElementById('error');
    const emptyState = document.getElementById('empty');
    const gridContainer = document.getElementById('grid');

    if (loadingState) loadingState.classList.toggle('hide', !showLoading);
    if (errorState) errorState.classList.toggle('hide', !showError);
    if (emptyState) emptyState.classList.toggle('hide', !showEmpty);
    if (gridContainer) gridContainer.classList.toggle('hide', !showGrid);
}

function buildProductCardElement(product) {
    const card = document.createElement('article');
    card.className = 'product-card';

    const formattedPrice = Number(product.price).toFixed(2);
    const stockStatusClass = product.stock > 0 ? 'in-stock' : 'out-of-stock';
    const stockStatusText = product.stock > 0 ? `${product.stock} units available` : 'Out of stock';

    card.innerHTML = `
        <div>
            <div class="product-header">
                <h2 class="product-title">${escapeHtml(product.name)}</h2>
                <span class="badge badge-category">${escapeHtml(product.category_name || 'General')}</span>
            </div>
            <span class="badge badge-sku">SKU: ${escapeHtml(product.sku)}</span>
            <div class="product-details">
                <div class="product-price">$${escapeHtml(formattedPrice)}</div>
                <div class="product-stock ${stockStatusClass}">${escapeHtml(stockStatusText)}</div>
                <div class="product-meta">Owner: ${escapeHtml(product.owner || 'System')}</div>
            </div>
        </div>
        <div class="product-actions">
            <button type="button" class="button button-sm button-restock" data-action="restock" data-id="${escapeHtml(product.id)}">
                + Restock (5)
            </button>
            <button type="button" class="button button-sm button-danger" data-action="delete" data-id="${escapeHtml(product.id)}">
                Delete
            </button>
        </div>
    `;
    return card;
}

function apiErrorMessage(data, status) {
    if (!data || typeof data !== 'object') {
        return `Request failed with HTTP ${status}.`;
    }
    if (data.detail) {
        return data.detail;
    }
    const messages = Object.entries(data)
        .map(([field, err]) => `${field}: ${Array.isArray(err) ? err.join(' ') : err}`);
    return messages.join(' | ') || `Request failed with HTTP ${status}.`;
}

function renderCategoryList(categories) {
    const categoryListContainer = document.getElementById('category-list');
    if (!categoryListContainer) return;
    categoryListContainer.innerHTML = '';
    if (categories.length === 0) {
        categoryListContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 0;">No categories registered yet.</div>';
        return;
    }
    categories.forEach(cat => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background-color: var(--background); border-radius: 6px; border: 1px solid var(--border);';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 600; font-size: 0.9rem;">${escapeHtml(cat.name)}</span>
                <span class="badge badge-sku">${escapeHtml(cat.slug)}</span>
            </div>
            <button type="button" class="button button-sm button-danger" data-category-action="delete" data-id="${escapeHtml(cat.id)}" style="padding: 2px 8px; font-size: 0.75rem;">
                Delete
            </button>
        `;
        categoryListContainer.appendChild(item);
    });
}

// =============================================================================
// TODO (Milestone 4): Implement DRF AJAX Communication Routines
// =============================================================================

// TODO: Implement getCookie(name) helper function to extract 'csrftoken' from document.cookie.
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// TODO: Implement writeApi(url, method, payload) helper attaching 'X-CSRFToken' header.
async function writeApi(url, method, payload) {
    const options = {
        method: method,
        headers: {
            'X-CSRFToken': getCookie('csrftoken') || '',
        }
    };

    if (payload) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(payload);
    }

    const response = await fetch(url, options);
    let data = null;
    if (response.status !== 204) {
        try {
            data = await response.json();
        } catch (e) {
            data = null;
        }
    }

    if (!response.ok) {
        const errorMsg = apiErrorMessage(data, response.status);
        throw new Error(errorMsg);
    }

    return data;
}

// TODO: Implement fetchProducts(searchQuery, categoryId) using Fetch API with abort controller.
async function fetchProducts(searchQuery = '', categoryId = '') {
    if (productsAbortController) {
        productsAbortController.abort();
    }
    productsAbortController = new AbortController();

    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const search = searchQuery || (searchInput ? searchInput.value : '');
    const category = categoryId || (categoryFilter ? categoryFilter.value : '');

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);

    const url = params.toString() ? `${BASE_PRODUCTS_ENDPOINT}?${params.toString()}` : BASE_PRODUCTS_ENDPOINT;

    displayPageSection({ showLoading: true });

    try {
        const response = await fetch(url, { signal: productsAbortController.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const products = Array.isArray(data) ? data : (data.results || []);

        if (products.length === 0) {
            displayPageSection({ showEmpty: true });
        } else {
            const gridContainer = document.getElementById('grid');
            if (gridContainer) {
                const cardElements = products.map(product => buildProductCardElement(product));
                gridContainer.replaceChildren(...cardElements);
            }
            displayPageSection({ showGrid: true });
        }
    } catch (error) {
        if (error.name === 'AbortError') return;
        displayPageSection({ showError: true });
    }
}

// TODO: Implement loadCategories(selectedId) fetching BASE_CATEGORIES_ENDPOINT and populating selects.
async function loadCategories(selectedId = null) {
    try {
        const response = await fetch(BASE_CATEGORIES_ENDPOINT);
        if (!response.ok) return;
        const data = await response.json();
        const categories = Array.isArray(data) ? data : (data.results || []);

        const categoryFilter = document.getElementById('category-filter');
        const productCategorySelect = document.getElementById('product-category');

        if (categoryFilter) {
            const currentVal = selectedId || categoryFilter.value;
            categoryFilter.innerHTML = '<option value="">All Categories</option>';
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.name;
                categoryFilter.appendChild(opt);
            });
            categoryFilter.value = currentVal;
        }

        if (productCategorySelect) {
            const currentVal = productCategorySelect.value;
            productCategorySelect.innerHTML = '<option value="">Select a category...</option>';
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.name;
                productCategorySelect.appendChild(opt);
            });
            if (currentVal) productCategorySelect.value = currentVal;
        }

        renderCategoryList(categories);
    } catch (e) {
        console.error('Failed to load categories', e);
    }
}
window.loadCategories = loadCategories;

// TODO: Implement addProduct(event) form submission handler calling writeApi(BASE_PRODUCTS_ENDPOINT, 'POST', payload).
async function addProduct(event) {
    event.preventDefault();
    const form = event.target;
    const payload = {
        name: document.getElementById('product-name')?.value,
        sku: document.getElementById('product-sku')?.value,
        category: document.getElementById('product-category')?.value,
        price: parseFloat(document.getElementById('product-price')?.value),
        stock: parseInt(document.getElementById('product-stock')?.value || 0, 10),
    };

    try {
        await writeApi(BASE_PRODUCTS_ENDPOINT, 'POST', payload);
        showToast('Product created successfully!', 'success');
        form.reset();
        const modal = document.getElementById('add-product-modal');
        if (modal) modal.classList.add('hide');
        fetchProducts();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// TODO: Implement addCategory(event) form submission handler calling writeApi(BASE_CATEGORIES_ENDPOINT, 'POST', payload).
async function addCategory(event) {
    event.preventDefault();
    const form = event.target;
    const payload = {
        name: document.getElementById('category-name')?.value,
    };
    const slugVal = document.getElementById('category-slug')?.value;
    if (slugVal && slugVal.trim() !== '') {
        payload.slug = slugVal.trim();
    }

    try {
        await writeApi(BASE_CATEGORIES_ENDPOINT, 'POST', payload);
        showToast('Category created successfully!', 'success');
        form.reset();
        await loadCategories();
        fetchProducts();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// =============================================================================
// Page Initialization & Event Binding
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('product-form');
    const categoryForm = document.getElementById('category-form');
    const categoryListContainer = document.getElementById('category-list');
    const gridContainer = document.getElementById('grid');
    const categoryFilter = document.getElementById('category-filter');
    const searchInput = document.getElementById('search-input');

    if (productForm) productForm.addEventListener('submit', addProduct);
    if (categoryForm) categoryForm.addEventListener('submit', addCategory);

    // TODO: Attach event delegation on categoryListContainer for deleting categories.
    if (categoryListContainer) {
        categoryListContainer.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-category-action="delete"]');
            if (!btn) return;
            const categoryId = btn.dataset.id;
            if (!confirm('Are you sure you want to delete this category?')) return;
            try {
                await writeApi(`${BASE_CATEGORIES_ENDPOINT}${categoryId}/`, 'DELETE');
                showToast('Category deleted successfully!', 'success');
                await loadCategories();
                fetchProducts();
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }

    // TODO: Attach event delegation on gridContainer for restock and delete actions.
    if (gridContainer) {
        gridContainer.addEventListener('click', async (e) => {
            const restockBtn = e.target.closest('[data-action="restock"]');
            const deleteBtn = e.target.closest('[data-action="delete"]');

            if (restockBtn) {
                const productId = restockBtn.dataset.id;
                try {
                    await writeApi(`${BASE_PRODUCTS_ENDPOINT}${productId}/restock/`, 'POST', { amount: 5 });
                    showToast('Product restocked (+5)!', 'success');
                    fetchProducts();
                } catch (error) {
                    showToast(error.message, 'error');
                }
            } else if (deleteBtn) {
                const productId = deleteBtn.dataset.id;
                if (!confirm('Are you sure you want to delete this product?')) return;
                try {
                    await writeApi(`${BASE_PRODUCTS_ENDPOINT}${productId}/`, 'DELETE');
                    showToast('Product deleted successfully!', 'success');
                    fetchProducts();
                } catch (error) {
                    showToast(error.message, 'error');
                }
            }
        });
    }

    // TODO: Attach change listener on categoryFilter.
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            fetchProducts();
        });
    }

    // TODO: Attach input listener with debounce on searchInput.
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                fetchProducts();
            }, 300);
        });
    }

    // Initial fetch
    fetchProducts();
    loadCategories();
});
