import React, { useEffect, useState, useMemo } from "react";
import {
  Container, Typography, Table, TableHead, TableBody, TableCell,
  TableRow, TableContainer, Paper, IconButton, Box, CircularProgress,
  Button, InputAdornment, TextField, Chip, Alert, Card, CardContent,
  Tooltip, Grid, TablePagination, Dialog, DialogTitle, DialogContent,
  DialogActions, Avatar
} from "@mui/material";
import {
  Visibility, Edit, Delete, Search, Clear, Add, Refresh,
  Gavel, LocationOn, Warning, AccountBalance
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api";

// Función para escapar caracteres especiales
function escapeRegExp(string = "") {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Resaltar coincidencias
function highlightText(text = "", query = "") {
  if (!query) return text;
  const tokens = query.split(/\s+/).filter(Boolean).map((t) => escapeRegExp(t));
  const regex = new RegExp(`(${tokens.join("|")})`, "ig");
  const parts = String(text).split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} style={{ backgroundColor: "#B085F5", padding: 2, borderRadius: 2 }}>{part}</mark>
      : <span key={i}>{part}</span>
  );
}

// Color de estado
const getEstadoColor = (estado = "") => {
  switch (estado.toLowerCase()) {
    case "activo": return "success";
    case "en_proceso": return "info";
    case "cerrado": return "default";
    case "archivado": return "warning";
    default: return "default";
  }
};

const getEstadoLabel = (estado = "") => {
  switch (estado.toLowerCase()) {
    case "activo": return "Activo";
    case "en_proceso": return "En Proceso";
    case "cerrado": return "Cerrado";
    case "archivado": return "Archivado";
    default: return estado;
  }
};

// Color por materia
const getMateriaColor = (materia = "") => {
  const m = materia.toLowerCase();
  if (m.includes("penal")) return { bg: "#ffebee", color: "#c62828", label: "Penal" };
  if (m.includes("civil") && m.includes("comercial")) return { bg: "#e3f2fd", color: "#1565c0", label: "Civil Comercial" };
  if (m.includes("familia")) return { bg: "#f3e5f5", color: "#7b1fa2", label: "Familia" };
  if (m.includes("niñez") || m.includes("adolescencia")) return { bg: "#fff3e0", color: "#e65100", label: "Niñez" };
  if (m.includes("trabajo") || m.includes("seguridad")) return { bg: "#e8f5e9", color: "#2e7d32", label: "Trabajo" };
  if (m.includes("contravencional")) return { bg: "#fce4ec", color: "#ad1457", label: "Contravencional" };
  if (m.includes("violencia")) return { bg: "#fbe9e7", color: "#bf360c", label: "Violencia" };
  if (m.includes("anticorrupción") || m.includes("anticorrupcion")) return { bg: "#e0f2f1", color: "#00695c", label: "Anticorrupción" };
  if (m.includes("sustancias")) return { bg: "#f1f8e9", color: "#558b2f", label: "Sustancias" };
  if (m.includes("instrucción") || m.includes("instruccion")) return { bg: "#e8eaf6", color: "#283593", label: "Instrucción" };
  if (m.includes("ejecución") || m.includes("ejecucion")) return { bg: "#efebe9", color: "#4e342e", label: "Ejecución" };
  return { bg: "#f5f5f5", color: "#616161", label: materia };
};

const getInitials = (nombre = "") => {
  return nombre.split(" ").map(w => w.charAt(0)).join("").toUpperCase().substring(0, 2);
};

export default function CasosList() {
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, caso: null });
  const navigate = useNavigate();
  const location = useLocation();

  // Detectar el prefijo de ruta según el rol del usuario (ej: /superadmin, /abogado, /admin)
  const routePrefix = useMemo(() => {
    const parts = location.pathname.split('/');
    // El primer segmento después de / es el prefijo de rol
    return parts.length > 1 ? `/${parts[1]}` : '/superadmin';
  }, [location.pathname]);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const loadCasos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/casos");
      setCasos(response.data || []);
    } catch (err) {
      console.error("Error al obtener casos:", err);
      setError("Error al cargar los casos");
      setCasos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCasos();
  }, []);

  // Filtro de búsqueda
  const filtered = useMemo(() => {
    if (!query) return casos;
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return casos.filter((caso) => {
      const texto = [
        caso.nurej_cud,
        caso.delito,
        caso.tipo_caso,
        caso.asunto,
        caso.cliente,
        caso.responsable_nombre_completo,
        caso.juzgado_nombre,
        caso.juzgado_ubicacion,
        caso.estado
      ].filter(Boolean).join(" ").toLowerCase();
      return tokens.every((t) => texto.includes(t));
    });
  }, [casos, query]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = casos.length;
    const activos = casos.filter(c => c.estado === "activo").length;
    const conJuzgado = casos.filter(c => c.juzgado_nombre).length;
    const sinJuzgado = total - conJuzgado;
    return { total, activos, conJuzgado, sinJuzgado };
  }, [casos]);

  const handleVer = (id) => navigate(`${routePrefix}/casos/${id}`);
  const handleEditar = (id) => navigate(`${routePrefix}/casos/editar/${id}`);
  const handleNuevo = () => navigate(`${routePrefix}/casos/nuevo`);

  const handleEliminarClick = (caso) => {
    setDeleteDialog({ open: true, caso });
  };

  const handleEliminarConfirm = async () => {
    if (!deleteDialog.caso) return;
    try {
      await api.delete(`/casos/${deleteDialog.caso.id}`);
      setCasos(prev => prev.filter(c => c.id !== deleteDialog.caso.id));
      setDeleteDialog({ open: false, caso: null });
    } catch (err) {
      console.error("Error al eliminar caso:", err);
      alert(err.response?.data?.message || "Error al eliminar el caso.");
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh" flexDirection="column">
        <CircularProgress sx={{ color: "primary.main" }} />
        <Typography sx={{ mt: 2 }} color="text.secondary">Cargando casos...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
          <Gavel sx={{ mr: 2, verticalAlign: "middle" }} />
          Gestión de Casos
        </Typography>
      </Box>

      {/* Estadísticas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: "center", p: 2, backgroundColor: "primary.main", color: "white" }}>
            <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
            <Typography variant="body2">Total Casos</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: "center", p: 2, backgroundColor: "success.main", color: "white" }}>
            <Typography variant="h4" fontWeight="bold">{stats.activos}</Typography>
            <Typography variant="body2">Activos</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: "center", p: 2, backgroundColor: "info.main", color: "white" }}>
            <AccountBalance sx={{ fontSize: 20, mb: 0.5 }} />
            <Typography variant="h4" fontWeight="bold">{stats.conJuzgado}</Typography>
            <Typography variant="body2">Con Juzgado</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: "center", p: 2, backgroundColor: stats.sinJuzgado > 0 ? "warning.main" : "grey.500", color: "white" }}>
            <Typography variant="h4" fontWeight="bold">{stats.sinJuzgado}</Typography>
            <Typography variant="body2">Sin Juzgado</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Barra de búsqueda y acciones */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={7}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por NUREJ, delito, asunto, cliente, juzgado..."
                value={rawQuery}
                onChange={(e) => { setRawQuery(e.target.value); setPage(0); }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: rawQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => { setRawQuery(""); setPage(0); }}>
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Tooltip title="Actualizar">
                  <IconButton onClick={loadCasos}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleNuevo}
                  sx={{ borderRadius: 1, textTransform: "none", fontWeight: 600 }}
                >
                  Nuevo Caso
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {query && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Mostrando {filtered.length} de {casos.length} casos para: &quot;{query}&quot;
        </Alert>
      )}

      {/* Tabla de casos */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", backgroundColor: "#1565c0", color: "white", width: 50 }}>
                #
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", backgroundColor: "#1565c0", color: "white" }}>
                NUREJ / Delito
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", backgroundColor: "#1565c0", color: "white" }}>
                Asunto
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", backgroundColor: "#1565c0", color: "white" }}>
                Cliente
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", backgroundColor: "#1565c0", color: "white" }}>
                Juzgado
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", backgroundColor: "#1565c0", color: "white", width: 100 }}>
                Estado
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", backgroundColor: "#1565c0", color: "white", width: 120, textAlign: "center" }}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length > 0 ? (
              filtered
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((caso, index) => (
                  <TableRow
                    key={caso.id}
                    hover
                    sx={{ "&:nth-of-type(odd)": { backgroundColor: "action.hover" } }}
                  >
                    {/* # */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {page * rowsPerPage + index + 1}
                      </Typography>
                    </TableCell>

                    {/* NUREJ / Delito */}
                    <TableCell>
                      {caso.nurej_cud && (
                        <Typography variant="caption" color="primary.main" fontWeight="bold" sx={{ display: "block" }}>
                          {highlightText(caso.nurej_cud, query)}
                        </Typography>
                      )}
                      <Typography variant="body2" fontWeight={600}>
                        {highlightText(caso.delito, query)}
                      </Typography>
                      <Chip
                        label={caso.tipo_caso}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.65rem", height: 20, mt: 0.5 }}
                      />
                    </TableCell>

                    {/* Asunto */}
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 220,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical"
                        }}
                      >
                        {highlightText(caso.asunto, query)}
                      </Typography>
                    </TableCell>

                    {/* Cliente */}
                    <TableCell>
                      {caso.cliente ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              fontSize: "0.7rem",
                              bgcolor: "primary.main"
                            }}
                          >
                            {getInitials(caso.cliente)}
                          </Avatar>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                            {highlightText(caso.cliente, query)}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.disabled">—</Typography>
                      )}
                    </TableCell>

                    {/* Juzgado */}
                    <TableCell>
                      {caso.juzgado_nombre ? (
                        <Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <AccountBalance sx={{ fontSize: 14, color: "primary.main" }} />
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              sx={{
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical"
                              }}
                            >
                              {highlightText(caso.juzgado_nombre, query)}
                            </Typography>
                          </Box>
                          {caso.juzgado_ubicacion && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                              <LocationOn sx={{ fontSize: 12, color: "text.secondary" }} />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                sx={{ maxWidth: 180 }}
                              >
                                {caso.juzgado_ubicacion}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Chip
                          label="Sin juzgado"
                          size="small"
                          variant="outlined"
                          color="warning"
                          sx={{ fontSize: "0.65rem", height: 22 }}
                        />
                      )}
                    </TableCell>

                    {/* Estado */}
                    <TableCell>
                      <Chip
                        label={getEstadoLabel(caso.estado)}
                        size="small"
                        color={getEstadoColor(caso.estado)}
                        sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                      />
                    </TableCell>

                    {/* Acciones */}
                    <TableCell sx={{ textAlign: "center" }}>
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" color="primary" onClick={() => handleVer(caso.id)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton size="small" color="info" onClick={() => handleEditar(caso.id)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" color="error" onClick={() => handleEliminarClick(caso)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                  <Gavel sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    {casos.length === 0 ? "No hay casos registrados" : "No se encontraron resultados"}
                  </Typography>
                  {casos.length === 0 && (
                    <Button variant="contained" startIcon={<Add />} onClick={handleNuevo} sx={{ mt: 2 }}>
                      Crear Primer Caso
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {filtered.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[10, 15, 25, 50]}
            component="div"
            count={filtered.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        )}
      </TableContainer>

      {/* Diálogo de eliminación */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, caso: null })}>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Warning color="error" />
            Confirmar Eliminación
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar el caso{" "}
            <strong>&quot;{deleteDialog.caso?.delito}&quot;</strong>?
          </Typography>
          {deleteDialog.caso?.juzgado_nombre && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Este caso está vinculado al juzgado: <strong>{deleteDialog.caso.juzgado_nombre}</strong>
              </Typography>
            </Alert>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Esta acción no se puede deshacer.</strong>
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, caso: null })}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleEliminarConfirm}
            startIcon={<Delete />}
          >
            Eliminar Caso
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
