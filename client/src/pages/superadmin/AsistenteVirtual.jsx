import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Box, Typography, TextField, Button, Paper, IconButton,
  Card, CardContent, Grid, Chip, CircularProgress, Alert,
  Avatar, Divider, List, ListItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, Fade, Tooltip, Select, MenuItem, FormControl,
  InputLabel
} from "@mui/material";
import {
  Send, SmartToy, Person, UploadFile, Summarize, Recommend,
  Description, Chat, ArrowBack, AttachFile, Close, Gavel,
  AccountBalance, Search, FolderOpen, Info
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api";

// Opciones del menú principal del asistente
const OPCIONES_ASISTENTE = [
  {
    id: "resumir_documento",
    titulo: "Resumir Documento",
    descripcion: "Sube un documento jurídico para obtener un resumen completo",
    icono: <UploadFile sx={{ fontSize: 40 }} />,
    color: "#1565c0",
    bg: "#e3f2fd"
  },
  {
    id: "resumir_caso",
    titulo: "Resumir Caso Guardado",
    descripcion: "Selecciona un caso para obtener un resumen con todos sus documentos",
    icono: <Summarize sx={{ fontSize: 40 }} />,
    color: "#2e7d32",
    bg: "#e8f5e9"
  },
  {
    id: "recomendar_caso",
    titulo: "Recomendación para Caso",
    descripcion: "Obtén recomendaciones legales para un caso guardado",
    icono: <Recommend sx={{ fontSize: 40 }} />,
    color: "#7b1fa2",
    bg: "#f3e5f5"
  },
  {
    id: "analizar_documento",
    titulo: "Analizar Documento",
    descripcion: "Sube un documento para análisis legal completo con recomendaciones",
    icono: <Description sx={{ fontSize: 40 }} />,
    color: "#e65100",
    bg: "#fff3e0"
  },
  {
    id: "chat",
    titulo: "Chat Legal",
    descripcion: "Conversa con el asistente sobre cualquier tema de derecho boliviano",
    icono: <Chat sx={{ fontSize: 40 }} />,
    color: "#00695c",
    bg: "#e0f2f1"
  }
];

// Formatear texto con markdown básico
function formatearRespuesta(texto) {
  if (!texto) return null;

  const lineas = texto.split('\n');
  const elementos = [];
  let key = 0;

  for (const linea of lineas) {
    key++;
    // Headers
    if (linea.startsWith('### ')) {
      elementos.push(
        <Typography key={key} variant="subtitle2" fontWeight="bold" sx={{ mt: 2, mb: 0.5, color: "primary.main" }}>
          {linea.replace('### ', '')}
        </Typography>
      );
    } else if (linea.startsWith('## ')) {
      elementos.push(
        <Typography key={key} variant="subtitle1" fontWeight="bold" sx={{ mt: 2, mb: 0.5, color: "primary.dark" }}>
          {linea.replace('## ', '')}
        </Typography>
      );
    } else if (linea.startsWith('# ')) {
      elementos.push(
        <Typography key={key} variant="h6" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>
          {linea.replace('# ', '')}
        </Typography>
      );
    }
    // Bold headers (numbered)
    else if (/^\*\*\d+\./.test(linea)) {
      elementos.push(
        <Typography key={key} variant="body1" fontWeight="bold" sx={{ mt: 1.5, mb: 0.5 }}>
          {linea.replace(/\*\*/g, '')}
        </Typography>
      );
    }
    // Bold lines
    else if (linea.startsWith('**') && linea.endsWith('**')) {
      elementos.push(
        <Typography key={key} variant="body1" fontWeight="bold" sx={{ mt: 1.5, mb: 0.5 }}>
          {linea.replace(/\*\*/g, '')}
        </Typography>
      );
    }
    // Bullet points
    else if (linea.startsWith('- ') || linea.startsWith('* ')) {
      elementos.push(
        <Typography key={key} variant="body2" sx={{ pl: 2, mb: 0.3 }}>
          {'\u2022 '}{linea.substring(2).replace(/\*\*/g, '')}
        </Typography>
      );
    }
    // Numbered lists
    else if (/^\d+\.\s/.test(linea)) {
      elementos.push(
        <Typography key={key} variant="body2" sx={{ pl: 1, mb: 0.3 }}>
          {linea.replace(/\*\*/g, '')}
        </Typography>
      );
    }
    // Empty lines
    else if (linea.trim() === '') {
      elementos.push(<Box key={key} sx={{ height: 8 }} />);
    }
    // Normal text
    else {
      elementos.push(
        <Typography key={key} variant="body2" sx={{ mb: 0.3 }}>
          {linea.replace(/\*\*/g, '')}
        </Typography>
      );
    }
  }

  return elementos;
}

export default function AsistenteVirtual() {
  const navigate = useNavigate();
  const location = useLocation();
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Detectar prefijo de ruta
  const routePrefix = useMemo(() => {
    const parts = location.pathname.split('/');
    return parts.length > 1 ? `/${parts[1]}` : '/superadmin';
  }, [location.pathname]);

  // Estado
  const [modo, setModo] = useState(null); // null = menú principal
  const [mensajes, setMensajes] = useState([]);
  const [inputMensaje, setInputMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Para selección de caso
  const [casos, setCasos] = useState([]);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [casosDialogOpen, setCasosDialogOpen] = useState(false);
  const [casosBusqueda, setCasosBusqueda] = useState("");
  const [cargandoCasos, setCargandoCasos] = useState(false);

  // Para upload de archivos
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // Cargar casos del usuario
  const cargarCasos = async () => {
    try {
      setCargandoCasos(true);
      const response = await api.get("/asistente/casos");
      setCasos(response.data || []);
    } catch (err) {
      console.error("Error al cargar casos:", err);
      setError("Error al cargar la lista de casos");
    } finally {
      setCargandoCasos(false);
    }
  };

  // Seleccionar un modo del menú principal
  const seleccionarModo = (opcionId) => {
    setModo(opcionId);
    setMensajes([]);
    setError(null);
    setArchivoSeleccionado(null);
    setCasoSeleccionado(null);

    // Mensajes iniciales según el modo
    const mensajesInicio = {
      resumir_documento: "Has seleccionado **Resumir Documento**. Por favor, sube un documento jurídico (PDF, DOCX o TXT) y lo analizaré para darte un resumen completo.",
      resumir_caso: "Has seleccionado **Resumir Caso Guardado**. Selecciona un caso de tu lista y generaré un resumen detallado incluyendo todos los documentos asociados.",
      recomendar_caso: "Has seleccionado **Recomendación para Caso**. Selecciona un caso y te daré recomendaciones legales estratégicas basadas en la legislación boliviana.",
      analizar_documento: "Has seleccionado **Analizar Documento**. Sube un documento jurídico y realizaré un análisis legal completo con recomendaciones.",
      chat: "Bienvenido al **Chat Legal**. Puedes hacerme cualquier consulta sobre derecho boliviano. Estoy aquí para ayudarte con información legal actualizada."
    };

    setMensajes([{
      role: "assistant",
      content: mensajesInicio[opcionId] || "Bienvenido al asistente legal.",
      timestamp: new Date()
    }]);

    // Si requiere selección de caso, cargar casos
    if (opcionId === "resumir_caso" || opcionId === "recomendar_caso") {
      cargarCasos();
      setCasosDialogOpen(true);
    }
  };

  // Volver al menú principal
  const volverAlMenu = () => {
    setModo(null);
    setMensajes([]);
    setError(null);
    setArchivoSeleccionado(null);
    setCasoSeleccionado(null);
  };

  // Manejar selección de archivo
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedExts = ['.pdf', '.doc', '.docx', '.txt'];
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedExts.includes(ext)) {
        setError("Solo se permiten archivos PDF, Word (.doc/.docx) y texto (.txt)");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setError("El archivo excede el tamaño máximo de 15MB");
        return;
      }
      setArchivoSeleccionado(file);
      setError(null);
    }
  };

  // Enviar documento para resumir
  const enviarDocumentoResumen = async () => {
    if (!archivoSeleccionado) return;

    const formData = new FormData();
    formData.append("documento", archivoSeleccionado);

    setMensajes(prev => [...prev, {
      role: "user",
      content: `Documento subido: ${archivoSeleccionado.name}`,
      timestamp: new Date(),
      isFile: true
    }]);

    setCargando(true);
    setArchivoSeleccionado(null);

    try {
      const response = await api.post("/asistente/resumir-documento", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000
      });

      setMensajes(prev => [...prev, {
        role: "assistant",
        content: response.data.respuesta,
        timestamp: new Date(),
        tipo: response.data.tipo
      }]);
    } catch (err) {
      console.error("Error:", err);
      setMensajes(prev => [...prev, {
        role: "assistant",
        content: err.response?.data?.message || "Error al procesar el documento. Verifica que sea un archivo válido.",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setCargando(false);
    }
  };

  // Enviar documento para análisis
  const enviarDocumentoAnalisis = async () => {
    if (!archivoSeleccionado) return;

    const formData = new FormData();
    formData.append("documento", archivoSeleccionado);

    setMensajes(prev => [...prev, {
      role: "user",
      content: `Documento para análisis: ${archivoSeleccionado.name}`,
      timestamp: new Date(),
      isFile: true
    }]);

    setCargando(true);
    setArchivoSeleccionado(null);

    try {
      const response = await api.post("/asistente/analizar-documento", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000
      });

      setMensajes(prev => [...prev, {
        role: "assistant",
        content: response.data.respuesta,
        timestamp: new Date(),
        tipo: response.data.tipo
      }]);
    } catch (err) {
      console.error("Error:", err);
      setMensajes(prev => [...prev, {
        role: "assistant",
        content: err.response?.data?.message || "Error al analizar el documento.",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setCargando(false);
    }
  };

  // Seleccionar caso y procesar
  const procesarCaso = async (caso) => {
    setCasoSeleccionado(caso);
    setCasosDialogOpen(false);

    setMensajes(prev => [...prev, {
      role: "user",
      content: `Caso seleccionado: ${caso.nurej_cud || `#${caso.id}`} - ${caso.delito || caso.asunto}`,
      timestamp: new Date()
    }]);

    setCargando(true);

    try {
      const endpoint = modo === "resumir_caso"
        ? `/asistente/resumir-caso/${caso.id}`
        : `/asistente/recomendar-caso/${caso.id}`;

      const response = await api.post(endpoint);

      setMensajes(prev => [...prev, {
        role: "assistant",
        content: response.data.respuesta,
        timestamp: new Date(),
        tipo: response.data.tipo,
        meta: {
          docsAnalizados: response.data.documentosAnalizados,
          totalDocs: response.data.totalDocumentos
        }
      }]);
    } catch (err) {
      console.error("Error:", err);
      setMensajes(prev => [...prev, {
        role: "assistant",
        content: err.response?.data?.message || "Error al procesar el caso.",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setCargando(false);
    }
  };

  // Enviar mensaje de chat
  const enviarMensajeChat = async () => {
    if (!inputMensaje.trim() || cargando) return;

    const mensaje = inputMensaje.trim();
    setInputMensaje("");

    setMensajes(prev => [...prev, {
      role: "user",
      content: mensaje,
      timestamp: new Date()
    }]);

    setCargando(true);

    try {
      // Construir historial (últimos 10 mensajes)
      const historial = mensajes
        .filter(m => !m.isFile && !m.isError)
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await api.post("/asistente/chat", {
        mensaje,
        historial
      }, { timeout: 60000 });

      setMensajes(prev => [...prev, {
        role: "assistant",
        content: response.data.respuesta,
        timestamp: new Date(),
        tipo: "chat"
      }]);
    } catch (err) {
      console.error("Error:", err);
      setMensajes(prev => [...prev, {
        role: "assistant",
        content: err.response?.data?.message || "Error al procesar tu consulta. Intenta de nuevo.",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setCargando(false);
    }
  };

  // Filtrar casos en el dialog
  const casosFiltrados = useMemo(() => {
    if (!casosBusqueda.trim()) return casos;
    const q = casosBusqueda.toLowerCase();
    return casos.filter(c =>
      (c.nurej_cud || '').toLowerCase().includes(q) ||
      (c.delito || '').toLowerCase().includes(q) ||
      (c.asunto || '').toLowerCase().includes(q) ||
      (c.cliente || '').toLowerCase().includes(q) ||
      (c.materia || '').toLowerCase().includes(q)
    );
  }, [casos, casosBusqueda]);

  // ── RENDER ────────────────────────────────────────────────

  // Menú principal
  if (!modo) {
    return (
      <Box sx={{ maxWidth: 960, mx: "auto", py: 4, px: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Avatar
            sx={{
              width: 80, height: 80, mx: "auto", mb: 2,
              bgcolor: "primary.main",
              boxShadow: "0 4px 20px rgba(25, 118, 210, 0.3)"
            }}
          >
            <SmartToy sx={{ fontSize: 45 }} />
          </Avatar>
          <Typography variant="h4" fontWeight="bold" color="primary.main">
            Asistente Legal IA
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 600, mx: "auto" }}>
            Especializado en derecho boliviano. Selecciona una opci&oacute;n para comenzar.
          </Typography>
        </Box>

        {/* Opciones */}
        <Grid container spacing={3}>
          {OPCIONES_ASISTENTE.map((opcion) => (
            <Grid item xs={12} sm={6} md={4} key={opcion.id}>
              <Card
                sx={{
                  cursor: "pointer",
                  transition: "all 0.3s",
                  border: "2px solid transparent",
                  height: "100%",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 6,
                    borderColor: opcion.color
                  }
                }}
                onClick={() => seleccionarModo(opcion.id)}
              >
                <CardContent sx={{ textAlign: "center", py: 4 }}>
                  <Avatar
                    sx={{
                      width: 70, height: 70, mx: "auto", mb: 2,
                      bgcolor: opcion.bg, color: opcion.color
                    }}
                  >
                    {opcion.icono}
                  </Avatar>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {opcion.titulo}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {opcion.descripcion}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Info */}
        <Alert severity="info" sx={{ mt: 4 }} icon={<Gavel />}>
          <Typography variant="body2">
            Este asistente utiliza inteligencia artificial especializada en legislaci&oacute;n boliviana.
            Las respuestas son orientativas y no reemplazan el criterio profesional de un abogado.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Vista de chat / interacción
  const opcionActual = OPCIONES_ASISTENTE.find(o => o.id === modo);
  const necesitaArchivo = modo === "resumir_documento" || modo === "analizar_documento";
  const esChatLibre = modo === "chat";

  return (
    <Box sx={{
      display: "flex", flexDirection: "column",
      height: "calc(100vh - 64px)", maxWidth: 960, mx: "auto",
      px: { xs: 1, sm: 2 }
    }}>
      {/* Header del chat */}
      <Paper
        elevation={2}
        sx={{
          p: 2, display: "flex", alignItems: "center", gap: 2,
          borderRadius: "12px 12px 0 0", mt: 2
        }}
      >
        <IconButton onClick={volverAlMenu} size="small">
          <ArrowBack />
        </IconButton>
        <Avatar sx={{ bgcolor: opcionActual?.bg, color: opcionActual?.color, width: 40, height: 40 }}>
          {opcionActual?.icono ? React.cloneElement(opcionActual.icono, { sx: { fontSize: 24 } }) : <SmartToy />}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {opcionActual?.titulo || "Asistente Legal"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Especializado en derecho boliviano
          </Typography>
        </Box>
        {casoSeleccionado && (
          <Chip
            icon={<FolderOpen />}
            label={casoSeleccionado.nurej_cud || `Caso #${casoSeleccionado.id}`}
            color="primary"
            variant="outlined"
            size="small"
          />
        )}
      </Paper>

      {/* Área de mensajes */}
      <Paper
        elevation={1}
        sx={{
          flexGrow: 1, overflow: "auto", p: 2,
          bgcolor: "#f8f9fa",
          display: "flex", flexDirection: "column", gap: 2
        }}
      >
        {mensajes.map((msg, idx) => (
          <Fade in key={idx}>
            <Box
              sx={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 1
              }}
            >
              {msg.role === "assistant" && (
                <Avatar
                  sx={{
                    width: 32, height: 32, bgcolor: msg.isError ? "error.main" : "primary.main",
                    flexShrink: 0, mt: 0.5
                  }}
                >
                  <SmartToy sx={{ fontSize: 18 }} />
                </Avatar>
              )}

              <Paper
                elevation={1}
                sx={{
                  p: 2, maxWidth: "80%", borderRadius: 2,
                  bgcolor: msg.role === "user"
                    ? "primary.main"
                    : msg.isError ? "#ffebee" : "white",
                  color: msg.role === "user" ? "white" : "text.primary"
                }}
              >
                {msg.isFile && (
                  <Chip
                    icon={<AttachFile />}
                    label={msg.content}
                    size="small"
                    sx={{ mb: 1, color: "white", borderColor: "rgba(255,255,255,0.5)" }}
                    variant="outlined"
                  />
                )}
                {!msg.isFile && (
                  <Box>{formatearRespuesta(msg.content)}</Box>
                )}
                {msg.meta && (
                  <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                    <Typography variant="caption" color="text.secondary">
                      Documentos analizados: {msg.meta.docsAnalizados} de {msg.meta.totalDocs}
                    </Typography>
                  </Box>
                )}
                <Typography
                  variant="caption"
                  sx={{
                    display: "block", mt: 1, textAlign: "right",
                    opacity: 0.6,
                    color: msg.role === "user" ? "rgba(255,255,255,0.7)" : "text.secondary"
                  }}
                >
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : ''}
                </Typography>
              </Paper>

              {msg.role === "user" && (
                <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main", flexShrink: 0, mt: 0.5 }}>
                  <Person sx={{ fontSize: 18 }} />
                </Avatar>
              )}
            </Box>
          </Fade>
        ))}

        {/* Indicador de cargando */}
        {cargando && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
              <SmartToy sx={{ fontSize: 18 }} />
            </Avatar>
            <Paper elevation={1} sx={{ p: 2, borderRadius: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Analizando...
              </Typography>
            </Paper>
          </Box>
        )}

        <div ref={chatEndRef} />
      </Paper>

      {/* Área de input */}
      <Paper
        elevation={3}
        sx={{
          p: 2, borderRadius: "0 0 12px 12px", mb: 2,
          bgcolor: "white"
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Upload de archivo (para modos de documento) */}
        {necesitaArchivo && (
          <Box sx={{ mb: 2 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />

            {archivoSeleccionado ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                <AttachFile color="primary" />
                <Typography variant="body2" sx={{ flexGrow: 1 }} noWrap>
                  {archivoSeleccionado.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(archivoSeleccionado.size / 1024).toFixed(0)} KB
                </Typography>
                <IconButton size="small" onClick={() => setArchivoSeleccionado(null)}>
                  <Close fontSize="small" />
                </IconButton>
                <Button
                  variant="contained"
                  size="small"
                  onClick={modo === "resumir_documento" ? enviarDocumentoResumen : enviarDocumentoAnalisis}
                  disabled={cargando}
                  startIcon={cargando ? <CircularProgress size={16} /> : <Send />}
                >
                  {modo === "resumir_documento" ? "Resumir" : "Analizar"}
                </Button>
              </Box>
            ) : (
              <Button
                variant="outlined"
                fullWidth
                startIcon={<UploadFile />}
                onClick={() => fileInputRef.current?.click()}
                disabled={cargando}
                sx={{ py: 1.5, borderStyle: "dashed" }}
              >
                Seleccionar documento (PDF, DOCX, TXT)
              </Button>
            )}
          </Box>
        )}

        {/* Botón para seleccionar caso (para modos de caso) */}
        {(modo === "resumir_caso" || modo === "recomendar_caso") && !casoSeleccionado && (
          <Button
            variant="outlined"
            fullWidth
            startIcon={<FolderOpen />}
            onClick={() => { cargarCasos(); setCasosDialogOpen(true); }}
            disabled={cargando}
            sx={{ mb: 2, py: 1.5, borderStyle: "dashed" }}
          >
            Seleccionar un caso
          </Button>
        )}

        {/* Input de chat (para modo chat o después de procesar un caso/documento) */}
        {(esChatLibre || (mensajes.length > 1 && !cargando)) && (
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder={esChatLibre
                ? "Escribe tu consulta legal..."
                : "Escribe una pregunta adicional..."
              }
              value={inputMensaje}
              onChange={(e) => setInputMensaje(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviarMensajeChat();
                }
              }}
              disabled={cargando}
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3
                }
              }}
            />
            <IconButton
              color="primary"
              onClick={enviarMensajeChat}
              disabled={!inputMensaje.trim() || cargando}
              sx={{
                bgcolor: "primary.main", color: "white",
                "&:hover": { bgcolor: "primary.dark" },
                "&.Mui-disabled": { bgcolor: "grey.300", color: "grey.500" },
                width: 42, height: 42
              }}
            >
              <Send />
            </IconButton>
          </Box>
        )}
      </Paper>

      {/* Dialog para seleccionar caso */}
      <Dialog
        open={casosDialogOpen}
        onClose={() => setCasosDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AccountBalance color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Seleccionar Caso
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por NUREJ, delito, asunto, cliente..."
            value={casosBusqueda}
            onChange={(e) => setCasosBusqueda(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
          />

          {cargandoCasos ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : casosFiltrados.length === 0 ? (
            <Alert severity="info">
              {casos.length === 0
                ? "No tienes casos guardados."
                : "No se encontraron casos con ese criterio de búsqueda."}
            </Alert>
          ) : (
            <List sx={{ maxHeight: 400, overflow: "auto" }}>
              {casosFiltrados.map((caso) => (
                <ListItem
                  key={caso.id}
                  button
                  onClick={() => procesarCaso(caso)}
                  sx={{
                    borderRadius: 1, mb: 0.5,
                    border: "1px solid", borderColor: "divider",
                    "&:hover": { bgcolor: "primary.light", borderColor: "primary.main" }
                  }}
                >
                  <ListItemIcon>
                    <Gavel color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {caso.nurej_cud || `Caso #${caso.id}`}
                        </Typography>
                        <Chip
                          label={caso.estado || "N/A"}
                          size="small"
                          color={caso.estado === "activo" ? "success" : "default"}
                        />
                        {caso.total_documentos > 0 && (
                          <Chip
                            label={`${caso.total_documentos} docs`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {caso.delito || caso.asunto || "Sin descripción"}
                        </Typography>
                        {caso.cliente && (
                          <Typography variant="caption" color="text.secondary">
                            Cliente: {caso.cliente}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCasosDialogOpen(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
