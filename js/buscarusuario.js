import { BASE_URL } from './url_base'
let usuariosPaginados = [];
let currentPage = 1;
const itemsPerPage = 10;

function confirmLogout(event) {
    event.preventDefault();
    const confirmed = confirm("Você deseja realmente sair da aplicação?");
    if (confirmed) {
        localStorage.clear(); 
        window.location.href = "./login.html";
    }
}

async function searchUsers() {
    const token = localStorage.getItem('token');
    const codigo = document.getElementById('codigo').value;
    const nome = document.getElementById('nome').value;
    const sobrenome = document.getElementById('sobrenome').value;

    const params = new URLSearchParams();
    if (codigo) params.append('id', codigo);
    if (nome) params.append('nome', nome);
    if (sobrenome) params.append('sobrenome', sobrenome);

    try {
        const response = await fetch(`${BASE_URL}/usuario/buscar?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            M.toast({ html: `Erro ao buscar usuários: ${response.statusText}`, classes: 'red' });
            return;
        }

        const usuarios = await response.json();
        populateResultsTable(usuarios);
    } catch (error) {
        M.toast({ html: `Erro de conexão: ${error.message}`, classes: 'red' });
        console.error('Erro:', error);
    }
}

function populateResultsTable(usuarios) {
    usuariosPaginados = usuarios;
    currentPage = 1;
    renderPage(); // mostra só os da página atual
}

function renderPage() {
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = usuariosPaginados.slice(startIndex, endIndex);

    if (pageItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum usuário encontrado</td></tr>';
        return;
    }

    pageItems.forEach(usuario => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${usuario.id}</td>
            <td>${usuario.nome}</td>
            <td>${usuario.sobrenome}</td>
            <td>
                <button class="action-button" onclick="editusuario('${usuario.id}')">
                    <span class="material-icons">edit</span>
                </button>
                <button class="action-button" onclick="confirmDelete('${usuario.id}')">
                    <span class="material-icons">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('pageInfo').textContent = `Página ${currentPage}`;
    document.getElementById('prevButton').disabled = currentPage === 1;
    document.getElementById('nextButton').disabled = endIndex >= usuariosPaginados.length;
}

function changePage(direction) {
    const totalPages = Math.ceil(usuariosPaginados.length / itemsPerPage);
    currentPage += direction;

    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    renderPage();
}

async function editusuario(codigo) {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${BASE_URL}/usuario/${codigo}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            M.toast({ html: `Erro ao buscar usuário: ${response.statusText}`, classes: 'red' });
            return;
        }

        const usuario = await response.json();

        localStorage.setItem('usuarioParaEditar', JSON.stringify(usuario));
        window.location.href = './alterarusuario.html';

    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        M.toast({ html: `Erro inesperado ao buscar os dados do usuário.`, classes: 'red' });
    }
}

async function confirmDelete(id) {
    const confirmed = confirm("Tem certeza que deseja excluir este usuário?");
    if (!confirmed) return;

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${BASE_URL}/usuario/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            M.toast({ html: 'Usuário excluído com sucesso!', classes: 'green' });
            searchUsers(); // Recarrega a lista
        } else {
            const errorData = await response.json();
            M.toast({ html: `Erro ao excluir usuário: ${errorData.message}`, classes: 'red' });
            console.log("Erro ao excluir usuário: " + (errorData.message || response.statusText));
        }
    } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        M.toast({ html: `Erro inesperado ao tentar excluir o usuário.`, classes: 'red' });
    }
}

function clearSearch() {
    document.getElementById('codigo').value = '';
    document.getElementById('nome').value = '';
    document.getElementById('sobrenome').value = '';
    document.querySelector('#resultsTable tbody').innerHTML = '';
    usuariosPaginados = [];
    currentPage = 1;
    document.getElementById('pageInfo').textContent = 'Página 1';
    document.getElementById('prevButton').disabled = true;
    document.getElementById('nextButton').disabled = true;
}
