import React, { useEffect, useState, useMemo } from "react";
import {
  Container, Typography, Table, TableHead, TableBody, TableCell,
  TableRow, TableContainer, Paper, IconButton, Box, CircularProgress,
  Button, InputAdornment, TextField, Chip, Alert, Card, CardContent,
  Tooltip, Grid, TablePagination, Select, MenuItem, FormControl, InputLabel
} from "@mui/material";
import { 
  Search, Clear, Refresh, OpenInNew,
  AccountBalance, Gavel, LocationOn, FilterList
} from "@mui/icons-material";
import api from "../../api";

// Función para escapar caracteres especiales
function escapeRegExp(string = "") {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Resaltar coincidencias en el texto
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

export default function JuzgadosList() {
  const [juzgados, setJuzgados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [materiaFilter, setMateriaFilter] = useState("todas");

  // Debounce del buscador
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [rawQuery]);

  // Obtener juzgados del Órgano Judicial
  const loadJuzgados = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/juzgados");
      setJuzgados(response.data || []);
    } catch (err) {
      console.error("Error al obtener juzgados:", err);
      setError("Error al cargar los juzgados del Órgano Judicial");
      setJuzgados([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJuzgados();
  }, []);

  // Filtrar juzgados por búsqueda y materia
  const filtered = useMemo(() => {
    let result = juzgados;

    if (materiaFilter !== "todas") {
      result = result.filter(j => j.materia?.toLowerCase().includes(materiaFilter.toLowerCase()));
    }

    if (query) {
      const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
      result = result.filter((juz) => {
        const texto = `${juz.nombre || ''} ${juz.lugar || ''} ${juz.edificio || ''} ${juz.calle || ''} ${juz.materia || ''}`.toLowerCase();
        return tokens.every((t) => texto.includes(t));
      });
    }

    return result;
  }, [juzgados, query, materiaFilter]);

  // Obtener materias únicas para el filtro
  const materiasUnicas = useMemo(() => {
    const materias = new Set();
    juzgados.forEach(j => {
      if (j.materia) materias.add(j.materia);
    });
    return Array.from(materias).sort();
  }, [juzgados]);

  // Estadísticas de juzgados
  const stats = useMemo(() => {
    const total = juzgados.length;
    const porMateria = {};
    juzgados.forEach(j => {
      const mat = j.materia || "Sin materia";
      porMateria[mat] = (porMateria[mat] || 0) + 1;
    });
    return { total, porMateria };
  }, [juzgados]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh" flexDirection="column">
        <CircularProgress sx={{ color: "primary.main" }} />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Obteniendo juzgados del Órgano Judicial...
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Consultando sitio oficial: lapaz.organojudicial.gob.bo
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
          <Gavel sx={{ mr: 2, verticalAlign: 'middle' }} />
          Juzgados - Órgano Judicial
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Lista de juzgados del Tribunal Departamental de Justicia de La Paz
        </Typography>
      </Box>

      {/* Banner informativo */}
      <Alert 
        severity="info" 
        sx={{ mb: 3 }}
        action={
          <Button 
            color="inherit" 
            size="small" 
            startIcon={<OpenInNew />}
            onClick={() => window.open("https://lapaz.organojudicial.gob.bo/Juzgados/Index#listaJuzgados", "_blank")}
          >
            Ver sitio oficial
          </Button>
        }
      >
        <Typography variant="body2">
          <strong>Fuente:</strong> Tribunal Departamental de Justicia de La Paz - Órgano Judicial de Bolivia.
          Datos obtenidos en tiempo real del sitio oficial.
        </Typography>
      </Alert>

      {/* Estadísticas */}
      {juzgados.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ textAlign: 'center', p: 2, background: 'linear-gradient(135deg, #1565c0, #1976d2)', color: 'white' }}>
              <AccountBalance sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
              <Typography variant="body2">Total Juzgados</Typography>
            </Card>
          </Grid>
          {Object.entries(stats.porMateria).slice(0, 3).map(([materia, count]) => {
            const colorInfo = getMateriaColor(materia);
            return (
              <Grid item xs={6} sm={3} key={materia}>
                <Card sx={{ textAlign: 'center', p: 2, backgroundColor: colorInfo.bg }}>
                  <Gavel sx={{ fontSize: 32, mb: 1, color: colorInfo.color }} />
                  <Typography variant="h4" fontWeight="bold" sx={{ color: colorInfo.color }}>{count}</Typography>
                  <Typography variant="body2" sx={{ color: colorInfo.color }}>{colorInfo.label}</Typography>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Barra de búsqueda y filtros */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar juzgado por nombre, lugar, edificio..."
                value={rawQuery}
                onChange={(e) => {
                  setRawQuery(e.target.value);
                  setPage(0);
                }}
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
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filtrar por Materia</InputLabel>
                <Select
                  value={materiaFilter}
                  label="Filtrar por Materia"
                  onChange={(e) => {
                    setMateriaFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="todas">Todas las materias</MenuItem>
                  {materiasUnicas.map(materia => (
                    <MenuItem key={materia} value={materia}>
                      {materia} ({stats.porMateria[materia] || 0})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Tooltip title="Actualizar desde sitio oficial">
                  <IconButton onClick={() => loadJuzgados()} disabled={loading}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
                <Chip
                  label={`${filtered.length} resultados`}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Button size="small" onClick={() => loadJuzgados()} sx={{ ml: 2 }}>
            Reintentar
          </Button>
        </Alert>
      )}

      {query && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Mostrando {filtered.length} de {juzgados.length} juzgados para: &quot;{query}&quot;
        </Alert>
      )}

      {/* Tabla de juzgados */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1565c0', color: 'white', width: 60 }}>
                #
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1565c0', color: 'white' }}>
                Lugar
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1565c0', color: 'white' }}>
                Oficina / Juzgado
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1565c0', color: 'white' }}>
                Detalle Ubicación
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1565c0', color: 'white', width: 150 }}>
                Materia
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1565c0', color: 'white', width: 80, textAlign: 'center' }}>
                Ver
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length > 0 ? (
              filtered
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((juzgado, index) => {
                  const colorInfo = getMateriaColor(juzgado.materia);
                  return (
                    <TableRow 
                      key={juzgado.id}
                      hover
                      sx={{
                        '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {page * rowsPerPage + index + 1}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOn sx={{ fontSize: 16, color: 'primary.main' }} />
                          <Typography variant="body2" fontWeight="medium">
                            {highlightText(juzgado.lugar, query)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {highlightText(juzgado.nombre, query)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {juzgado.edificio && (
                            <Typography variant="body2" sx={{ color: 'green', fontWeight: 'bold' }}>
                              {highlightText(juzgado.edificio, query)}
                            </Typography>
                          )}
                          {juzgado.calle && (
                            <Typography variant="caption" sx={{ color: 'saddlebrown', display: 'block' }}>
                              {highlightText(juzgado.calle, query)}
                            </Typography>
                          )}
                          {juzgado.piso && (
                            <Typography variant="caption" sx={{ color: 'orangered', display: 'block' }}>
                              {juzgado.piso}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={colorInfo.label}
                          size="small"
                          sx={{
                            backgroundColor: colorInfo.bg,
                            color: colorInfo.color,
                            fontWeight: 600,
                            fontSize: '0.7rem'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {juzgado.detalleUrl && (
                          <Tooltip title="Ver detalle en sitio oficial">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => window.open(juzgado.detalleUrl, "_blank")}
                            >
                              <OpenInNew fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
            ) : (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                  <Gavel sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    {juzgados.length === 0 ? "No se pudieron cargar los juzgados" : "No se encontraron resultados"}
                  </Typography>
                  {juzgados.length === 0 && (
                    <Button variant="contained" onClick={() => loadJuzgados()} sx={{ mt: 2 }}>
                      Cargar Juzgados
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {filtered.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
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

      {/* Nota al pie */}
      <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Fuente:</strong> Tribunal Departamental de Justicia de La Paz - 
          <a 
            href="https://lapaz.organojudicial.gob.bo/Juzgados/Index#listaJuzgados" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ marginLeft: 4 }}
          >
            lapaz.organojudicial.gob.bo
          </a>
          . Los datos se obtienen en tiempo real del sitio oficial del Órgano Judicial.
        </Typography>
      </Box>
    </Container>
  );
}
