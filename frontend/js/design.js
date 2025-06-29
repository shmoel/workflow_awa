function montrerConfirmation() {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('modal').style.display = 'block';
}

function fermerModal() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('modal').style.display = 'none';
}


function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? text.toString().replace(/[&<>"']/g, m => map[m]) : '';
}

function formatDate(dateInput) {
    const date = new Date(dateInput);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // +1 car les mois vont de 0-11
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}




function fillTable_dmd_valider(demandes) {
    const tbody = document.getElementById('demandes_valider');
    tbody.innerHTML = '';
    demandes.forEach(t => {

        const className = t.Event === 'Statut 2' ? 'btn btn-glow-primary btn-primary' :
                          t.Event === 'Statut 3' ? 'btn btn-glow-warning btn-warning' : 
                          t.Event === 'Statut 4' ? 'btn btn-glow-success btn-success' :
                  'btn btn-glow-secondary btn-secondary';

        const row = `
            <tr>
                <td class='align-middle'>
                <label class='custom-control custom-checkbox mb-0'>
                   ${escapeHtml(t.Sigle || 'N/A')}<br>
                </label>
                </td>
                <td class='align-middle'>
                <label class='custom-control custom-checkbox mb-0'>
                    ${escapeHtml(t.Categorie || 'N/A')}<br>
                </label>
                </td>
                <td class='align-middle'>
                    <div class=''>
                           <div class='media-body align-self-center ml-3'>
                           ${escapeHtml(t.libelle || 'N/A')}
                    </div>
                </td>
                <td class='align-middle'>
                    <div class=''>
                          <div class='d-inline-block align-middle'>
                          ${escapeHtml(t.nom_client || 'N/A')}
                    </div>
                </td>
                <td class='align-middle'>
                    <div class=''>
                            <div class='d-inline-block align-middle'>
                            ${escapeHtml(t.date_time || 'N/A')}
                    </div>
                </td>
                <td class='align-middle'>
                    <div class=''>
                            <div class='d-inline-block align-middle'>
                            <button type="button" onclick="window.location.href='index.php?action=consultation_dmd&id_dmd=${t.id_demande}'" class="${className}">${escapeHtml(t.Event || 'N/A')}</button>
                    </div>
                </td>

            </tr>
        `;
        tbody.innerHTML += row;
    });
}


function filterTable_dmd_insert(demandes) {
    const filterEntity = document.getElementById('filterEntity').value.toLowerCase();
    const filterType = document.getElementById('filterType').value.toLowerCase();
    const filterConterpart = document.getElementById('filterConterpart').value.toLowerCase();
    const filterdate = document.getElementById('filterdate').value.toLowerCase();

    const demandes_inserer = demandes.filter(t => {
        return (
            t.Categorie.toLowerCase().includes(filterEntity) &&
            t.libelle.toLowerCase().includes(filterType) &&
            t.nom_client.toLowerCase().includes(filterConterpart) &&
            t.heure.toLowerCase().includes(filterdate)
        );
    });

    fillTable_dmd_insert(demandes_inserer);
}

function filterTable_dmd_valider(demandes) {
    const filterEntity = document.getElementById('filterEntity').value.toLowerCase();
    const filterType = document.getElementById('filterType').value.toLowerCase();
    const filterConterpart = document.getElementById('filterConterpart').value.toLowerCase();
    const filterdate = document.getElementById('filterdate').value.toLowerCase();

    const demandes_valider = demandes.filter(t => {
        return (
            t.Categorie.toLowerCase().includes(filterEntity) &&
            t.libelle.toLowerCase().includes(filterType) &&
            t.nom_client.toLowerCase().includes(filterConterpart) &&
            t.heure.toLowerCase().includes(filterdate)
        );
    });

    fillTable_dmd_valider(demandes_valider);
}



