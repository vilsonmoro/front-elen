import { BASE_URL } from './url_base'
let vendasPaginados = [];
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

async function searchVenda() {
    const codigo = document.getElementById('codigo').value.trim();
    const cliente = document.getElementById('cliente').value.trim();
    const pedido = document.getElementById('pedido').value.trim();
    const dataInicio = document.getElementById('dataInicio').value.trim();
    const dataFim = document.getElementById('dataFim').value.trim();
    const token = localStorage.getItem('token');

    const params = new URLSearchParams();

    if (codigo) params.append('idVenda', codigo);
    if (cliente) params.append('nomeCliente', cliente);
    if (pedido) params.append('idPedido', pedido);
    if (dataInicio) params.append('dataInicial', dataInicio);
    if (dataFim) params.append('dataFinal', dataFim);

    try {
        const response = await fetch(`${BASE_URL}/venda/buscar?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar vendas');
        }

        const vendas = await response.json();
        populateResultsTable(vendas);
    } catch (error) {
        console.error(error);
        M.toast({ html: `Erro ao buscar vendas: ${error.message}`, classes: 'red' });
    }
}

function populateResultsTable(vendas) {
    vendasPaginados = vendas;
    currentPage = 1;
    renderPage();
}

function renderPage() {
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = vendasPaginados.slice(startIndex, endIndex);

    if (pageItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhuma venda encontrada</td></tr>';
        return;
    }

    pageItems.forEach(venda => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${venda.id}</td>
            <td>${venda.pedido?.id || '-'}</td>
            <td>${venda.cliente?.nome || '-'}</td>
            <td>R$ ${venda.valorTotal?.toFixed(2) || '0.00'}</td>
            <td>
                <button class="action-button" onclick="editvenda('${venda.id}')">
                    <span class="material-icons">edit</span>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('pageInfo').textContent = `Página ${currentPage}`;
    document.getElementById('prevButton').disabled = currentPage === 1;
    document.getElementById('nextButton').disabled = endIndex >= vendasPaginados.length;
}

function changePage(direction) {
    const totalPages = Math.ceil(vendasPaginados.length / itemsPerPage);
    currentPage += direction;

    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    renderPage();
}

function clearSearch() {
    document.getElementById('codigo').value = '';
    document.getElementById('cliente').value = '';
    document.getElementById('pedido').value = '';
    document.getElementById('dataInicio').value = '';
    document.getElementById('dataFim').value = '';
    document.querySelector('#resultsTable tbody').innerHTML = '';
    vendasPaginados = [];
    currentPage = 1;
    document.getElementById('pageInfo').textContent = 'Página 1';
    document.getElementById('prevButton').disabled = true;
    document.getElementById('nextButton').disabled = true;
}

async function editvenda(codigo) {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${BASE_URL}/venda/${codigo}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            M.toast({ html: `Erro ao buscar venda: ${response.statusText}`, classes: 'red' });
            return;
        }

        const venda = await response.json();
        localStorage.setItem('vendaParaEditar', JSON.stringify(venda));
        window.location.href = './alterarvenda.html';
    } catch (error) {
        M.toast({ html: `Erro inesperado ao buscar os dados da venda: ${error}`, classes: 'red' });
    }
}