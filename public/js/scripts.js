document.getElementById('searchInput').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    fetch(`/api/mods?q=${query}`)
        .then(response => response.json())
        .then(mods => {
            const modList = document.getElementById('modList');
            modList.innerHTML = ejs.render('<%- include("partials/mod_list", { mods }) %>', { mods });
        });
});