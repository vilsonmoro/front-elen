const BASE_URL = 'https://projeto-elen-veiga.onrender.com';
document.addEventListener('DOMContentLoaded', function () {
    const elems = document.querySelectorAll('select');
    M.FormSelect.init(elems);

    const tabs = document.querySelectorAll('.tabs');
    M.Tabs.init(tabs, { swipeable: false });
});

function confirmLogout(event) {
    event.preventDefault();
    const confirmed = confirm("Você deseja realmente sair da aplicação?");
    if (confirmed) {
        localStorage.clear();
        window.location.href = "./login.html";
    }
}

function limparCampos() {
    document.getElementById('logadouro').value = '';
    document.getElementById('cidade').value = '';
    document.getElementById('estado').value = '';
    document.getElementById('cep').value = '';
    document.getElementById('nome').value = '';
    document.getElementById('observacoes').value = '';
    document.getElementById('tipo_entrega').selectedIndex = 0;
    document.getElementById('formapagamento').selectedIndex = 0;

    const elems = document.querySelectorAll('select');
    M.FormSelect.init(elems);
}

document.getElementById('cadastrarBtn').addEventListener('click', async function (event) {
    event.preventDefault();
   console.log('aqui')
    const logadouro = document.getElementById('logadouro').value.trim();
    const cidade = document.getElementById('cidade').value.trim();
    const estado = document.getElementById('estado').value.trim();
    const cep = document.getElementById('cep').value.trim();
    const nome = document.getElementById('nome').value.trim();
    const observacao = document.getElementById('observacoes').value.trim();
    const tipoEntregaInput = document.getElementById('tipo_entrega').value;
    const formaPagamentoInput = document.getElementById('formapagamento').value;

    if (!nome || !logadouro || !cidade || !estado || !formaPagamentoInput || !tipoEntregaInput) {
        M.toast({ html: 'Preencha todos os campos obrigatórios.', classes: 'red darken-2' });
        return;
    }

    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    if (!token || !userId) {
        M.toast({ html: 'Usuário não autenticado!', classes: 'red darken-2' });
        return;
    }

    const formaPagamentoMap = {
        'dinheiro': 'DINHEIRO',
        'credito': 'CREDITO',
        'debito': 'DEBITO',
        'pix': 'PIX',
        'ted': 'TED'
    };

    const tipoEntregaMap = {
        'retirada': 'RETIRADA',
        'sedex': 'SEDEX',
        'transportadora': 'TRANSPORTADORA',
        'carro': 'CARRO'
    };

    const clienteData = {
        nome: nome,
        observacao: observacao,
        logadouro: logadouro,
        cidade: cidade,
        estado: estado,
        cep: cep,
        usuario: {
            id: parseInt(userId)
        },
        tipo_entrega: tipoEntregaMap[tipoEntregaInput],
        forma_pagamento: formaPagamentoMap[formaPagamentoInput]
    };

    try {
        const response = await fetch(`${BASE_URL}/cliente`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(clienteData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao cadastrar cliente');
        }

        const result = await response.json();
        M.toast({ html: 'Cliente cadastrado com sucesso!', classes: 'green' });
        limparCampos();

        const instance = M.Tabs.getInstance(document.querySelector('.tabs'));
        instance.select('cliente');

    } catch (error) {
        M.toast({ html: `Erro: ${error.message}`, classes: 'red darken-2' });
    }
});
