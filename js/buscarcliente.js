import { BASE_URL } from './url_base'

let clientesPaginados = [];
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

async function searchCliente() {
	const codigo = document.getElementById('codigo').value.trim();
	const nome = document.getElementById('nome').value.trim();
	const token = localStorage.getItem('token');

	const params = new URLSearchParams();
	if (codigo) params.append('id', codigo);
	if (nome) params.append('nome', nome); 

	try {
		const response = await fetch(`${BASE_URL}/cliente/buscar?${params.toString()}`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error('Erro ao buscar clientes');
		}

		const clientes = await response.json();

		// Aplica filtro no frontend também como fallback
		let filtrados = clientes;
		if (nome) {
			const nomeLower = nome.toLowerCase();
			filtrados = clientes.filter(c => c.nome && c.nome.toLowerCase().includes(nomeLower));
		}
		if (codigo) {
			filtrados = filtrados.filter(c => String(c.id).includes(codigo));
		}

		populateResultsTable(filtrados);
	} catch (error) {
		console.error(error);
		M.toast({ html: `Erro ao buscar clientes: ${error}`, classes: 'red' });
	}
}

function populateResultsTable(clientes) {
    clientesPaginados = clientes;
    currentPage = 1;
    renderPage();
}

function renderPage() {
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = ''; 

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = clientesPaginados.slice(startIndex, endIndex);

    if (pageItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum cliente encontrado</td></tr>';
        return;
    }

    pageItems.forEach(cliente => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${cliente.id}</td>
            <td>${cliente.nome}</td>
            <td>
                <button class="action-button" onclick="editcliente('${cliente.id}')">
                    <span class="material-icons">edit</span>
                </button>
                <button class="action-button" onclick="confirmDelete('${cliente.id}')">
                    <span class="material-icons">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('pageInfo').textContent = `Página ${currentPage}`;
    document.getElementById('prevButton').disabled = currentPage === 1;
    document.getElementById('nextButton').disabled = endIndex >= clientesPaginados.length;
}

function changePage(direction) {
    const totalPages = Math.ceil(clientesPaginados.length / itemsPerPage);
    currentPage += direction;

    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    renderPage();
}

function clearSearch() {
	document.getElementById('codigo').value = '';
	document.getElementById('nome').value = '';
	document.querySelector('#resultsTable tbody').innerHTML = '';
	clientesPaginados = [];
    currentPage = 1;
    document.getElementById('pageInfo').textContent = 'Página 1';
    document.getElementById('prevButton').disabled = true;
    document.getElementById('nextButton').disabled = true;
}

async function editcliente(codigo) {
	const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${BASE_URL}/cliente/${codigo}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            M.toast({ html: `Erro ao buscar cliente: ${response.statusText}`, classes: 'red' });
            return;
        }

        const cliente = await response.json();

        localStorage.setItem('clienteParaEditar', JSON.stringify(cliente));

        window.location.href = './alterarcliente.html';

    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        M.toast({ html: `Erro inesperado ao buscar os dados do cliente.`, classes: 'red' });
    }
}

async function confirmDelete(codigo) {
	const confirmed = confirm("Tem certeza que deseja excluir este cliente?");
    if (!confirmed) return;

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${BASE_URL}/cliente/${codigo}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            M.toast({ html: 'Cliente excluído com sucesso!', classes: 'green' });
            searchCliente();
        } else {
            const errorData = await response.json();
            M.toast({ html: `Erro ao excluir o cliente: ${response.statusText}`, classes: 'red' });
            console.log("Erro ao excluir o cliente: " + (errorData.message || response.statusText));
        }
    } catch (error) {
        console.error("Erro ao excluir o cliente:", error);
        M.toast({ html: `Erro inesperado ao tentar excluir o cliente: ${error.message}`, classes: 'red' });
    }
}


