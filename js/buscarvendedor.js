import { BASE_URL } from './url_base'
let vendedoresPaginados = [];
let currentPage = 1;
const itemsPerPage = 10;

async function searchVendedor() {
    const token = localStorage.getItem('token');
    const codigo = document.getElementById('codigo').value;
    const nome = document.getElementById('nome').value;
    const sobrenome = document.getElementById('sobrenome').value;
    const statusInput = document.getElementById('status').value;
    const status = statusInput ? statusInput.toUpperCase() : null;

    const params = new URLSearchParams();
    if (codigo) params.append('id', codigo);
    if (nome) params.append('nome', nome);
    if (sobrenome) params.append('sobrenome', sobrenome);
    if (status) params.append('status', status);

    try {
        const response = await fetch(`${BASE_URL}/vendedor/buscar?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            M.toast({ html: `Erro ao buscar vendedores: ${response.statusText}`, classes: 'red' });
            return;
        }

        const vendedores = await response.json();
        populateResultsTable(vendedores);
    } catch (error) {
        M.toast({ html: `Erro de conexão: ${error.message}`, classes: 'red' });
        console.error('Erro:', error);
    }
}

function populateResultsTable(vendedores) {
    vendedoresPaginados = vendedores;
    currentPage = 1;
    renderPage(); // Só renderiza os da página atual
}

async function editvendedor(codigo) {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${BASE_URL}/vendedor/${codigo}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            M.toast({ html: `Erro ao buscar vendedor: ${response.statusText}`, classes: 'red' });
            return;
        }

        const vendedor = await response.json();

        // Salva os dados no localStorage
        localStorage.setItem('vendedorParaEditar', JSON.stringify(vendedor));

        // Redireciona para a página de alteração
        window.location.href = './alterarvendedor.html';

    } catch (error) {
        M.toast({ html: `Erro inesperado ao buscar os dados do vendedor.`, classes: 'red' });
        console.error('Erro ao buscar vendedor:', error);
    }
}

async function confirmDelete(id) {
    const confirmed = confirm("Tem certeza que deseja excluir este vendedor?");
    if (!confirmed) return;

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${BASE_URL}/vendedor/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            M.toast({ html: 'Vendedor excluído com sucesso!', classes: 'green' });
            searchVendedor(); // Recarrega a lista
        } else {
            const errorData = await response.json();
            M.toast({ html: `Erro ao excluir vendedor: ${errorData.message || response.statusText}`, classes: 'red' });
        }
    } catch (error) {
        M.toast({ html: `Erro ao excluir vendedor: ${error.message}`, classes: 'red' });
    }
}


function renderPage() {
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = ''; // Limpa resultados anteriores

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = vendedoresPaginados.slice(startIndex, endIndex);

    if (pageItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum vendedor encontrado</td></tr>';
        return;
    }

    pageItems.forEach(vendedor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${vendedor.id}</td>
            <td>${vendedor.nome}</td>
            <td>${vendedor.sobrenome}</td>
            <td>${vendedor.statusVendedor}</td>
            <td>
                <button class="action-button" onclick="editvendedor('${vendedor.id}')">
                    <span class="material-icons">edit</span>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Atualiza info da paginação
    document.getElementById('pageInfo').textContent = `Página ${currentPage}`;
    document.getElementById('prevButton').disabled = currentPage === 1;
    document.getElementById('nextButton').disabled = endIndex >= vendedoresPaginados.length;
}

function changePage(direction) {
    const totalPages = Math.ceil(vendedoresPaginados.length / itemsPerPage);
    currentPage += direction;

    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    renderPage();
}

function clearSearch() {
    document.getElementById('codigo').value = '';
    document.getElementById('nome').value = '';
    document.getElementById('sobrenome').value = '';
    document.getElementById('status').value = '';
    document.querySelector('#resultsTable tbody').innerHTML = '';
    vendedoresPaginados = [];
    currentPage = 1;
    document.getElementById('pageInfo').textContent = 'Página 1';
    document.getElementById('prevButton').disabled = true;
    document.getElementById('nextButton').disabled = true;
}

