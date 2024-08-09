document.getElementById('searchInput').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const modItems = document.querySelectorAll('.mod-item');

    modItems.forEach(item => {
        const modName = item.querySelector('.mod-info h2').textContent.toLowerCase();
        if (modName.includes(query)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const modList = document.getElementById('modList');

    if (modList) {
        modList.addEventListener('click', (event) => {
            if (event.target && event.target.classList.contains('view-btn')) {
                const modId = event.target.getAttribute('data-id');
                if (modId) {
                    window.location.href = `/mod/${modId}`;
                }
            }
        });
    }
});