import { BASE_URL } from './url_base'

function confirmLogout(event) {
    event.preventDefault();
    const confirmed = confirm("Você deseja realmente sair da aplicação?");
    if (confirmed) {
        localStorage.clear();
        window.location.href = "./login.html";
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const clienteData = localStorage.getItem('clienteParaEditar');

    if (!clienteData) {
        M.toast({ html: 'Nenhum cliente selecionado para edição.', classes: 'yellow' });
        window.location.href = './buscarcliente.html';
        return;
    }

    const cliente = JSON.parse(clienteData);

    // Preenche campos do formulário com os dados do cliente
    document.getElementById('codigo').value = cliente.id ?? '';
    document.getElementById('nome').value = cliente.nome ?? '';
    document.getElementById('observacoes').value = cliente.observacao ?? '';
    document.getElementById('logadouro').value = cliente.logadouro ?? '';
    document.getElementById('cidade').value = cliente.cidade ?? '';
    document.getElementById('estado').value = cliente.estado ?? '';
    document.getElementById('cep').value = cliente.cep ?? '';

    const formaPagamentoSelect = document.getElementById('formapagamento');
    const tipoEntregaSelect = document.getElementById('tipo_entrega');

    if (cliente.forma_pagamento) {
        formaPagamentoSelect.value = cliente.forma_pagamento;
    }

    if (cliente.tipo_entrega) {
        tipoEntregaSelect.value = cliente.tipo_entrega;
    }

    // Inicializa Materialize
    M.FormSelect.init(formaPagamentoSelect);
    M.FormSelect.init(tipoEntregaSelect);
    M.updateTextFields();
    const tabs = document.querySelectorAll('.tabs');
    M.Tabs.init(tabs);
});

document.getElementById('salvarBtn').addEventListener('click', async function (event) {
    event.preventDefault();

    const clienteData = localStorage.getItem('clienteParaEditar');
    const userID = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    if (!clienteData || !userID || !token) {
        M.toast({ html: 'Cliente ou usuário não encontrado. Faça o login novamente.', classes: 'yellow' });
        window.location.href = './buscarcliente.html';
        return;
    }

    const cliente = JSON.parse(clienteData);
    const clienteId = cliente.id;

    if (!clienteId) {
        M.toast({ html: 'ID do cliente não encontrado.', classes: 'yellow' });
        return;
    }

    const clienteEditado = {
        nome: document.getElementById('nome').value.trim(),
        observacao: document.getElementById('observacoes').value.trim(),
        logadouro: document.getElementById('logadouro').value.trim(),
        cidade: document.getElementById('cidade').value.trim(),
        estado: document.getElementById('estado').value.trim(),
        cep: document.getElementById('cep').value.trim(),
        tipo_entrega: document.getElementById('tipo_entrega').value,
        forma_pagamento: document.getElementById('formapagamento').value,
        usuario: {
            id: parseInt(userID)
        }
    };

    try {
        const response = await fetch(`${BASE_URL}/cliente/${clienteId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clienteEditado)
        });

        const responseBody = await response.json();

        if (response.ok) {
            M.toast({ html: 'Cliente atualizado com sucesso!', classes: 'green' });
            setTimeout(() => {
            window.location.href = "./buscarcliente.html";
            }, 1500);
        } else {
            const errorMsg = responseBody.message || responseBody.error || 'Erro desconhecido (cliente).';
            M.toast({ html: `Erro ao atualizar cliente: ${errorMsg}`, classes: 'red' });
        }
    } catch (error) {
        M.toast({ html: `Erro de conexão (cliente): ${error.message}`, classes: 'red' });
    }
});

window.addEventListener('beforeunload', function () {
    localStorage.removeItem('clienteParaEditar');
});
