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
    const elems = document.querySelectorAll('select');
    M.FormSelect.init(elems);

    const tabs = document.querySelectorAll('.tabs');
    M.Tabs.init(tabs);

    const produtoData = localStorage.getItem('produtoParaEditar');

    if (!produtoData) {
        M.toast({ html: 'Nenhum produto selecionado para edição.', classes: 'yellow' });
        window.location.href = './buscarproduto.html';
        return;
    }

    const produto = JSON.parse(produtoData);

    // Preencher os campos com valores ou vazios
    document.getElementById('codigo').value = produto.id ?? '';
    document.getElementById('nome').value = produto.nome ?? '';
    document.getElementById('peso').value = produto.peso ?? '';
    document.getElementById('modelagem').value = produto.modelagem ?? '';
    document.getElementById('desenvolvimento').value = produto.desenvolvimento ?? '';
    document.getElementById('corte').value = produto.corte ?? '';
    document.getElementById('malha').value = produto.malha ?? '';
    document.getElementById('costura').value = produto.precoCostura ?? '';
    document.getElementById('etqmarca').value = produto.etiquetaMarca ?? '';
    document.getElementById('etqcomp').value = produto.etiquetaComposicao ?? '';
    document.getElementById('tag').value = produto.tag ?? '';
    document.getElementById('refil').value = produto.refilPistola ?? '';
    document.getElementById('elastico').value = produto.elastico ?? '';
    document.getElementById('saco').value = produto.sacoPlastico ?? '';
    document.getElementById('fita').value = produto.fita ?? '';
    document.getElementById('embalagem').value = produto.embalagem ?? '';
    document.getElementById('deslocamento').value = produto.deslocamento ?? '';
    document.getElementById('fatormult').value = produto.fatormult ?? '';
    document.getElementById('valoratacado').value = produto.valoratacado ?? '';
    document.getElementById('valorvarejo').value = produto.valorvarejo ?? '';
    document.getElementById('custo').value = produto.custoProduto ?? '';

    M.updateTextFields();
});

document.querySelector('.btn').addEventListener('click', async function (e) {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const peso = parseFloat(document.getElementById('peso').value);
    const modelagem = parseFloat(document.getElementById('modelagem').value);
    const desenvolvimento = parseFloat(document.getElementById('desenvolvimento').value);
    const corte = parseFloat(document.getElementById('corte').value);
    const malha = parseFloat(document.getElementById('malha').value);
    const precoCostura = parseFloat(document.getElementById('costura').value);
    const etiquetaMarca = parseFloat(document.getElementById('etqmarca').value);
    const etiquetaComposicao = parseFloat(document.getElementById('etqcomp').value);
    const tag = parseFloat(document.getElementById('tag').value);
    const refilPistola = parseFloat(document.getElementById('refil').value);
    const elastico = parseFloat(document.getElementById('elastico').value);
    const sacoPlastico = parseFloat(document.getElementById('saco').value);
    const fita = parseFloat(document.getElementById('fita').value);
    const embalagem = parseFloat(document.getElementById('embalagem').value);
    const deslocamento = parseFloat(document.getElementById('deslocamento').value);
    const custoProduto = parseFloat(document.getElementById('custo').value);
    const fatormult = parseFloat(document.getElementById('fatormult').value);
    const valoratacado = parseFloat(document.getElementById('valoratacado').value);
    const valorvarejo = parseFloat(document.getElementById('valorvarejo').value);

    const camposFaltando = [];
    if (!nome) camposFaltando.push('Nome');
    if (!custoProduto) camposFaltando.push('Custo do produto');
    if (!fatormult) camposFaltando.push('Fator de multiplicação');
    if (!valoratacado) camposFaltando.push('Valor no atacado');
    if (!valorvarejo) camposFaltando.push('Valor no varejo');

    if (camposFaltando.length > 0) {
        M.toast({ html: `Preencha os seguintes campos obrigatórios: ${camposFaltando.join(', ')}`, classes: 'yellow' });
        //alert(`Preencha os seguintes campos obrigatórios: ${camposFaltando.join(', ')}`);
        return;
    }

    const produtoData = localStorage.getItem('produtoParaEditar');
    if (!produtoData) {
        M.toast({ html: 'Produto não encontrado.', classes: 'yellow' });
        //alert('Produto não encontrado.');
        return;
    }

    const produtoOriginal = JSON.parse(produtoData);
    const id = produtoOriginal.id;

    const usuarioId = localStorage.getItem('userId');
    if (!usuarioId) {
        M.toast({ html: 'ID do usuário não encontrado. Faça login novamente.', classes: 'yellow' });
        //alert('ID do usuário não encontrado. Faça login novamente.');
        return;
    }

    const dadosAtualizados = {
        nome,
        peso,
        modelagem,
        desenvolvimento,
        corte,
        malha,
        precoCostura,
        etiquetaMarca,
        etiquetaComposicao,
        tag,
        refilPistola,
        elastico,
        sacoPlastico,
        fita,
        embalagem,
        deslocamento,
        custoProduto,
        fatormult,
        valoratacado,
        valorvarejo,
        usuario: {
            id: parseInt(usuarioId)
        }
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/produto/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosAtualizados)
        });

        if (response.ok) {
            M.toast({ html: 'Produto atualizado com sucesso!', classes: 'green' });
            window.location.href = './buscarproduto.html';
        } else {
            const erro = await response.json();
            const errorMsg = errorData.message || errorData.error || 'Erro desconhecido.';
            M.toast({ html: `Erro ao atualizar vendedor: ${errorMsg}`, classes: 'red' });
        }
    } catch (error) {
        M.toast({ html: `Erro de conexão: ${error.message}`, classes: 'red' });
    }
});

function calcularValorVarejoEAtacado() {
    const custo = parseFloat(document.getElementById('custo').value);
    const fatorMult = parseFloat(document.getElementById('fatormult').value);

    if (isNaN(custo) || isNaN(fatorMult)) {
        M.toast({ html: 'Preencha corretamente os campos de custo e fator multiplicador.', classes: 'red darken-2' });
        return;
    }

    const valorVarejo = custo + (custo * (fatorMult / 100));
    document.getElementById('valorvarejo').value = valorVarejo.toFixed(2);

    const valorAtacado = valorVarejo - (valorVarejo * 0.10);
    document.getElementById('valoratacado').value = valorAtacado.toFixed(2);
    M.updateTextFields();
}

window.addEventListener('beforeunload', function () {
    localStorage.removeItem('produtoParaEditar');
});
