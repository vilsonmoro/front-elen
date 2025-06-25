import { BASE_URL } from './url_base'

function confirmLogout(event) {
    event.preventDefault();
    const confirmed = confirm("Você deseja realmente sair da aplicação?");
    if (confirmed) {
        localStorage.clear(); 
        window.location.href = "./login.html";
    }
}

window.onload = function() {
    const usuarioData = localStorage.getItem('usuarioParaEditar');

    if (!usuarioData) {
        M.toast({ html: 'Nenhum usuário selecionado para edição.', classes: 'yellow' });
        window.location.href = './buscarusuario.html';
        return;
    }

    const usuarioObj = JSON.parse(usuarioData);

    document.getElementById('nome').value = usuarioObj.nome;
    document.getElementById('sobrenome').value = usuarioObj.sobrenome;
    document.getElementById('usuario').value = usuarioObj.usuario; 
    document.getElementById('email').value = usuarioObj.email;
    document.getElementById('senha').value = usuarioObj.senha || "";

    M.updateTextFields();
    
};

document.querySelector('.btn').addEventListener('click', async function(e) {
    e.preventDefault(); 

    const nome = document.getElementById('nome').value.trim();
    const sobrenome = document.getElementById('sobrenome').value.trim();
    const usuario = document.getElementById('usuario').value.trim();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmarsenha').value;

    // Verifica campos obrigatórios
    const camposFaltando = [];
    if (!nome) camposFaltando.push('Nome');
    if (!usuario) camposFaltando.push('Usuário');
    if (!email) camposFaltando.push('E-mail');
    if (!senha) camposFaltando.push('Senha');
    if (!confirmarSenha) camposFaltando.push('Confirmar Senha');

    if (camposFaltando.length > 0) {
        M.toast({ html: `Os seguintes campos são obrigatórios: ${camposFaltando.join(', ')}`, classes: 'red' });
        return;
    }

    // Validações adicionais
    if (usuario.length < 3 || usuario.length > 25) {
        M.toast({ html: 'O usuário deve ter entre 3 e 25 caracteres.', classes: 'yellow' });
        return;
    }

    if (usuario.includes(' ')) {
        M.toast({ html: 'O usuário não pode conter espaços.', classes: 'yellow' });
        return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        M.toast({ html: 'Por favor, insira um e-mail válido.', classes: 'yellow' });
        return;
    }

    const senhaPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (senha && !senhaPattern.test(senha)) {
        M.toast({ html: 'A senha deve conter pelo menos uma letra maiúscula, uma letra minúscula, um caractere especial e ter no mínimo 8 caracteres.', classes: 'yellow' });
        return;
    }

    if (senha !== confirmarSenha) {
        M.toast({ html: 'As senhas não coincidem.', classes: 'yellow' });
        return;
    }

    const usuarioData = localStorage.getItem('usuarioParaEditar');
    if (!usuarioData) {
        M.toast({ html: 'Usuário não encontrado.', classes: 'red' });
        return;
    }

    const usuarioOriginal = JSON.parse(usuarioData);
    const id = usuarioOriginal.id;

    const usuarioId = localStorage.getItem('userId');
    if (!usuarioId) {
        M.toast({ html: 'ID do usuário não encontrado. Faça login novamente.', classes: 'yellow' });
        return;
    }

    const usuarioAtualizado = {
        id,
        nome,
        sobrenome,
        usuario,
        email,
        senha
    };

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${BASE_URL}/usuario/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(usuarioAtualizado)
        });

        if (response.ok) {
            M.toast({ html: 'Usuário atualizado com sucesso!', classes: 'green' });
            window.location.href = './buscarusuario.html';
        } else {
            const errorData = await response.json();
            const errorMsg = errorData.message || errorData.error || 'Erro desconhecido.';
            M.toast({ html: `Erro ao atualizar usuário: ${errorMsg}`, classes: 'red' });
        }
    } catch (error) {
        M.toast({ html: `Erro de conexão: ${error.message}`, classes: 'red' });
    }
});


window.addEventListener('beforeunload', function () {
    localStorage.removeItem('usuarioParaEditar');
});

// Alterar visibilidade da senha
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const eyeIcon = input.nextElementSibling.querySelector('.material-icons');

    if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.textContent = 'visibility';
    } else {
        input.type = 'password';
        eyeIcon.textContent = 'visibility_off';
    }
}