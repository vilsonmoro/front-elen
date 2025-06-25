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
    var tabs = document.querySelectorAll('.tabs');
    var instances = M.Tabs.init(tabs);

    var confecTab = document.querySelector('.tabs .tab a[href="#confeccao"]');
    if (confecTab) {
        confecTab.click(); 
    }
    
    var tabLinks = document.querySelectorAll('.tabs a');
    tabLinks.forEach(function (tabLink) {
        tabLink.addEventListener('click', function () {
            setTimeout(function () {
                M.updateTextFields();
            }, 100);
        });
    });
});

function calcularCusto() {
    var peso = parseFloat(document.getElementById('peso').value) || 0;
    var modelagem = parseFloat(document.getElementById('modelagem').value) || 0;
    var desenvolvimento = parseFloat(document.getElementById('desenvolvimento').value) || 0;
    var corte = parseFloat(document.getElementById('corte').value) || 0;
    var malha = parseFloat(document.getElementById('malha').value) || 0;
    var costura = parseFloat(document.getElementById('costura').value) || 0;

    var etqmarca = parseFloat(document.getElementById('etqmarca').value) || 0;
    var etqcomp = parseFloat(document.getElementById('etqcomp').value) || 0;
    var tag = parseFloat(document.getElementById('tag').value) || 0;
    var refil = parseFloat(document.getElementById('refil').value) || 0;
    var elastico = parseFloat(document.getElementById('elastico').value) || 0;

    var saco = parseFloat(document.getElementById('saco').value) || 0;
    var fita = parseFloat(document.getElementById('fita').value) || 0;
    var embalagem = parseFloat(document.getElementById('embalagem').value) || 0;
    var deslocamento = parseFloat(document.getElementById('deslocamento').value) || 0;

    var custoProduto = peso + modelagem + desenvolvimento + corte + malha + costura +
                       etqmarca + etqcomp + tag + refil + elastico + saco + fita + embalagem + deslocamento;

    document.getElementById('custo').value = custoProduto.toFixed(4);  // Exibe até 4 casas decimais
}

function limparCampos() {
    const campos = [
        'nome', 'peso', 'modelagem', 'desenvolvimento', 'corte', 'malha',
        'costura', 'etqmarca', 'etqcomp', 'tag', 'refil', 'elastico',
        'saco', 'fita', 'embalagem', 'deslocamento', 'custo', 'precofinal', 'valorsite', 'valorvenda'
    ];

    campos.forEach(campo => {
        const element = document.getElementById(campo);
        if (element) {
            element.value = '';
        } else {
            console.warn(`Elemento com id "${campo}" não encontrado.`);
        }
    });

    const tabs = document.querySelector('.tabs'); 
    const instance = M.Tabs.getInstance(tabs); 

    instance.select('confeccao'); 
}


async function enviarProduto() {

    var nome = document.getElementById('nome').value;
    var custoProduto = parseFloat(document.getElementById('custo').value) || 0;

    //Validações
        const camposFaltando = [];
    if (!nome) camposFaltando.push('Nome');
    if (!custoProduto) camposFaltando.push('Custo do produto');
    if (!fatormult) camposFaltando.push('Fator de multiplicação');
    if (!valoratacado) camposFaltando.push('Valor no atacado');
    if (!valorvarejo) camposFaltando.push('Valor no varejo');

    if (camposFaltando.length > 0) {
        M.toast({ html: `Preencha os seguintes campos obrigatórios: ${camposFaltando.join(', ')}`, classes: 'red' });
        return;
    }
    
    var peso = parseFloat(document.getElementById('peso').value) || 0;
    var modelagem = parseFloat(document.getElementById('modelagem').value) || 0;
    var desenvolvimento = parseFloat(document.getElementById('desenvolvimento').value) || 0;
    var corte = parseFloat(document.getElementById('corte').value) || 0;
    var malha = parseFloat(document.getElementById('malha').value) || 0;
    var costura = parseFloat(document.getElementById('costura').value) || 0;

    var etqmarca = parseFloat(document.getElementById('etqmarca').value) || 0;
    var etqcomp = parseFloat(document.getElementById('etqcomp').value) || 0;
    var tag = parseFloat(document.getElementById('tag').value) || 0;
    var refil = parseFloat(document.getElementById('refil').value) || 0;
    var elastico = parseFloat(document.getElementById('elastico').value) || 0;

    var saco = parseFloat(document.getElementById('saco').value) || 0;
    var fita = parseFloat(document.getElementById('fita').value) || 0;
    var embalagem = parseFloat(document.getElementById('embalagem').value) || 0;
    var deslocamento = parseFloat(document.getElementById('deslocamento').value) || 0;

    var fatormult = parseFloat(document.getElementById('fatormult').value) || 0;
    var valorvarejo = parseFloat(document.getElementById('valorvarejo').value) || 0;
    var valoratacado = parseFloat(document.getElementById('valoratacado').value) || 0;

    var usuarioId = localStorage.getItem('userId');

    var produto = {
        nome: nome,
        peso: peso,
        modelagem: modelagem,
        desenvolvimento: desenvolvimento,
        corte: corte,
        malha: malha,
        etiquetaMarca: etqmarca,
        etiquetaComposicao: etqcomp,
        tag: tag,
        refilPistola: refil,
        sacoPlastico: saco,
        fita: fita,
        elastico: elastico,
        precoCostura: costura,
        embalagem: embalagem,
        custoProduto: custoProduto,
        fatormult: fatormult,
        valorvarejo: valorvarejo,
        valoratacado: valoratacado,
        usuario: {
            id: usuarioId
        }
    };

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${BASE_URL}/produto`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(produto),
        });

        if (response.ok) {
            M.toast({ html: 'Produto cadastrado com sucesso!', classes: 'green' });
            limparCampos();
        } else {
            const erro = await response.json();
            const errorMsg = errorData.message || errorData.error || 'Erro desconhecido.';
            M.toast({ html: `Erro ao cadastrar produto: ${errorMsg}`, classes: 'red' });
        }
    } catch (error) {
        M.toast({ html: `Erro de conexão: ${error.message}`, classes: 'red' });
    }
}

function calcularValorVarejoEAtacado() {
    const custo = parseFloat(document.getElementById('custo').value);
    const fatorMult = parseFloat(document.getElementById('fatormult').value);

    if (isNaN(custo) || isNaN(fatorMult)) {
        M.toast({ html: 'Preencha corretamente os campos de custo e fator multiplicador.', classes: 'red' });
        return;
    }

    const valorVarejo = custo + (custo * (fatorMult / 100));
    document.getElementById('valorvarejo').value = valorVarejo.toFixed(2);

    const valorAtacado = valorVarejo - (valorVarejo * 0.10);
    document.getElementById('valoratacado').value = valorAtacado.toFixed(2);
    M.updateTextFields();
}

document.getElementById('cadastrarBtn').addEventListener('click', function(event) {
    event.preventDefault(); 
    enviarProduto();
});