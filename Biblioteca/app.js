/* Filtros usados pelas páginas clássicas; seguro também fora do Hub. */
function filterSelection(category) {
    const selected = category === 'all' ? '' : String(category || '');
    document.querySelectorAll('.filterDiv').forEach(element => {
        element.classList.toggle('show', !selected || element.classList.contains(selected));
    });
}
function AddClass(element, names) {
    String(names || '').split(/\s+/).filter(Boolean).forEach(name => element.classList.add(name));
}
function RemoveClass(element, names) {
    String(names || '').split(/\s+/).filter(Boolean).forEach(name => element.classList.remove(name));
}
function initializeLegacyFilters() {
    filterSelection('all');
    const container = document.getElementById('myBtnContainer');
    if (!container) return;
    container.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', () => {
            container.querySelectorAll('.btn.active').forEach(current => {
                current.classList.remove('active');
                current.setAttribute('aria-pressed', 'false');
            });
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');
        });
    });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeLegacyFilters, { once: true });
else initializeLegacyFilters();
