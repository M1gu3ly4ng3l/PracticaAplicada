<?php

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    $correo = $_POST['email'];
    $contrasena = $_POST['password'];

    echo "<div style='font-family: Arial; padding: 20px;'>";
    echo "<h2>¡Datos recibidos en el servidor!</h2>";
    echo "<p><strong>Correo ingresado:</strong> " . htmlspecialchars($correo) . "</p>";
    echo "<p><strong>Contraseña ingresada:</strong> " . htmlspecialchars($contrasena) . "</p>";
    echo "<br><a href='index.html'>Volver al Login</a>";
    echo "</div>";

} else {

header("Location: index.html");
    exit();
}
?>