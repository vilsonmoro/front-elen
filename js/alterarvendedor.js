import { BASE_URL } from './url_base'

document.addEventListener('DOMContentLoaded', function() {
	const elems = document.querySelectorAll('select');
	const instances = M.FormSelect.init(elems);
});

function confirmLogout(event) {
    event.preventDefault();
    const confirmed = confirm("Você deseja realmente sair da aplicação?");
    if (confirmed) {
        localStorage.clear(); 
        window.location.href = "./login.html";
    }
}

window.onload = function() {
    const vendedorData = localStorage.getItem('vendedorParaEditar');

    if (!vendedorData) {
        M.toast({ html: 'Nenhum vendedor selecionado para edição.', classes: 'yellow' });
        window.location.href = './buscarvendedor.html';
        return;
    }

    const vendedor = JSON.parse(vendedorData);

    document.getElementById('codigo').value = vendedor.id;
    document.getElementById('nome').value = vendedor.nome;
    document.getElementById('sobrenome').value = vendedor.sobrenome;
    document.getElementById('email').value = vendedor.email;
    document.getElementById('desconto').value = vendedor.desconto || 0;
    document.getElementById('observacoes').value = vendedor.observacao || '';

    const statusElement = document.getElementById('status');
    const statusValue = vendedor.statusVendedor ? vendedor.statusVendedor.toLowerCase() : 'ativo';
    
    if (statusValue === 'ativo' || statusValue === 'inativo') {
        statusElement.value = statusValue;
    } else {
        statusElement.value = 'ativo';
    }

    M.FormSelect.init(statusElement);

    M.updateTextFields();
};

document.querySelector('.btn').addEventListener('click', async function(e) {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const sobrenome = document.getElementById('sobrenome').value.trim();
    const email = document.getElementById('email').value.trim();
    const desconto = parseFloat(document.getElementById('desconto').value);
    const status = document.getElementById('status').value;
    const observacao = document.getElementById('observacoes').value.trim();

    // Validações
    const camposFaltando = [];
    if (!nome) camposFaltando.push('Nome');
    if (!desconto) camposFaltando.push('Desconto');
    if (!status) camposFaltando.push('Status');

    if (camposFaltando.length > 0) {
        M.toast({ html: `Preencha os seguintes campos obrigatórios: ${camposFaltando.join(', ')}`, classes: 'yellow' });
        return;
    }
    if (desconto < 0 || desconto > 100) {
        M.toast({ html: 'O desconto deve ser um valor entre 0 e 100.', classes: 'yellow' });
        return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        M.toast({ html: 'Por favor, insira um e-mail válido.', classes: 'yellow' });
        return;
    }

    if (observacao.length > 250) {
        M.toast({ html: 'A observação deve ter no máximo 250 caracteres.', classes: 'yellow' });
        return;
    }

    const vendedorData = localStorage.getItem('vendedorParaEditar');
    if (!vendedorData) {
        M.toast({ html: `Vendedor não encontrado.`, classes: 'red' });
        return;
    }

    const vendedorOriginal = JSON.parse(vendedorData);
    const id = vendedorOriginal.id;

    const usuarioId = localStorage.getItem('userId');
    if (!usuarioId) {
        M.toast({ html: `ID do usuário não encontrado. Faça login novamente.`, classes: 'red' });
        return;
    }

    const vendedorAtualizado = {
        id,
        nome,
        sobrenome,
        email,
        desconto,
        observacao,
        statusVendedor: status.toUpperCase(),
        usuario: {
            id: parseInt(usuarioId)
        }
    };

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${BASE_URL}/vendedor/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(vendedorAtualizado)
        });

        if (response.ok) {
            M.toast({ html: 'Vendedor atualizado com sucesso!', classes: 'green' });
            window.location.href = './buscarvendedor.html';
        } else {
            const errorData = await response.json();
            const errorMsg = errorData.message || errorData.error || 'Erro desconhecido.';
            M.toast({ html: `Erro ao atualizar vendedor: ${errorMsg}`, classes: 'red' });
        }
    } catch (error) {
        M.toast({ html: `Erro inesperado ao atualizar vendedor: ${error}`, classes: 'red' });
    }
});

window.addEventListener('beforeunload', function () {
    localStorage.removeItem('vendedorParaEditar');
});
