import React, { useEffect, useState, useMemo } from "react";
import {
  Container, Typography, Table, TableHead, TableBody, TableCell,
  TableRow, TableContainer, Paper, IconButton, Box, CircularProgress,
  Button, InputAdornment, TextField, Chip, Alert, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Avatar, Grid, Divider, Drawer, Tabs, Tab,
  TablePagination, Select, MenuItem, FormControl, InputLabel
} from "@mui/material";
import { 
  Visibility, Edit, Delete, Search, Clear, Add, 
  LocationOn, ContactPhone, Business, Refresh,
  FilterList, Warning, Map as MapIcon,
  Close, Menu as MenuIcon, Gavel, OpenInNew,
  AccountBalance, Link as LinkIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
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

const getInitials = (nombre = "") => {
  return nombre.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
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

// Componente de Mapa (Simplificado con iframe de OpenStreetMap)
const MapaInstituciones = ({ instituciones, institucionSeleccionada, onSelectInstitucion }) => {
  const defaultCenter = [-16.5000, -68.1500];
  
  const getMapUrl = () => {
    let centerLat = defaultCenter[0];
    let centerLng = defaultCenter[1];
    
    if (institucionSeleccionada) {
      const direccionesValidas = institucionSeleccionada.direcciones?.filter(d => d.direccion) || [];
      if (direccionesValidas.length > 0) {
        const lat = defaultCenter[0] + (institucionSeleccionada.id % 10) * 0.01 - 0.05;
        const lng = defaultCenter[1] + (institucionSeleccionada.id % 10) * 0.01 - 0.05;
        centerLat = lat;
        centerLng = lng;
      }
    }
    
    return `https://www.openstreetmap.org/export/embed.html?bbox=${centerLng-0.1}%2C${centerLat-0.1}%2C${centerLng+0.1}%2C${centerLat+0.1}&layer=mapnik&marker=${centerLat}%2C${centerLng}`;
  };
  
  const ubicaciones = useMemo(() => {
    const ubicacionesArray = [];
    
    instituciones.forEach(institucion => {
      if (institucion.direcciones && Array.isArray(institucion.direcciones)) {
        institucion.direcciones.forEach((direccion, index) => {
          if (direccion.direccion) {
            ubicacionesArray.push({
              id: `${institucion.id}-${index}`,
              institucionId: institucion.id,
              institucionNombre: institucion.nombre,
              direccion: direccion.direccion,
              contacto: direccion.contacto,
              color: institucion.id === institucionSeleccionada?.id ? '#1976d2' : '#4caf50'
            });
          }
        });
      }
    });
    
    return ubicacionesArray;
  }, [instituciones, institucionSeleccionada]);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, p: 0, position: 'relative' }}>
        <Box sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              zIndex: 1000,
              p: 2,
              background: 'linear-gradient(rgba(0,0,0,0.6), transparent)'
            }}>
              <Typography variant="h6" color="white" fontWeight="bold">
                <MapIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Mapa de Instituciones
              </Typography>
              <Typography variant="body2" color="white">
                {ubicaciones.length} ubicaciones registradas
              </Typography>
            </Box>
        
        <Box sx={{ height: '500px', width: '100%', position: 'relative' }}>
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            marginHeight="0"
            marginWidth="0"
            src={getMapUrl()}
            style={{ border: 'none' }}
            title="Mapa de Instituciones"
          >
          </iframe>
        </Box>
        
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Ubicaciones Registradas
          </Typography>
          
          {ubicaciones.length > 0 ? (
            <Grid container spacing={1}>
              {ubicaciones.slice(0, 6).map((ubicacion) => {
                const institucion = instituciones.find(i => i.id === ubicacion.institucionId);
                const isSelected = institucionSeleccionada?.id === ubicacion.institucionId;
                
                return (
                  <Grid item xs={12} sm={6} key={ubicacion.id}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        p: 1.5, 
                        cursor: 'pointer',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        backgroundColor: isSelected ? 'primary.light' : 'background.paper',
                        '&:hover': {
                          backgroundColor: isSelected ? 'primary.light' : 'action.hover',
                        }
                      }}
                      onClick={() => {
                        if (institucion && onSelectInstitucion) {
                          onSelectInstitucion(institucion);
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Box sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          backgroundColor: ubicacion.color,
                          mt: 0.5,
                          flexShrink: 0
                        }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {ubicacion.institucionNombre}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            <LocationOn sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                            {ubicacion.direccion}
                          </Typography>
                          {ubicacion.contacto && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              <ContactPhone sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                              {ubicacion.contacto}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
              
              {ubicaciones.length > 6 && (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Mostrando 6 de {ubicaciones.length} ubicaciones. Usa el buscador para filtrar.
                  </Alert>
                </Grid>
              )}
            </Grid>
          ) : (
            <Alert severity="warning">
              No hay direcciones registradas. Agrega direcciones a las instituciones para verlas en el mapa.
            </Alert>
          )}
        </Box>
        
        <Box sx={{ 
          p: 2, 
          borderTop: 1, 
          borderColor: 'divider',
          backgroundColor: 'grey.50'
        }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Nota:</strong> El mapa muestra ubicaciones aproximadas. Para coordenadas exactas, integra un servicio de geocoding.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

// Panel de pestañas
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tab-panel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default function InstitucionesList() {
  const [instituciones, setInstituciones] = useState([]);
  const [juzgados, setJuzgados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [juzgadosLoading, setJuzgadosLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [error, setError] = useState(null);
  const [juzgadosError, setJuzgadosError] = useState(null);
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({ open: false, institucion: null });
  const [institucionSeleccionada, setInstitucionSeleccionada] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // Paginación para juzgados
  const [juzgadosPage, setJuzgadosPage] = useState(0);
  const [juzgadosRowsPerPage, setJuzgadosRowsPerPage] = useState(25);

  // Filtro de materia para juzgados
  const [materiaFilter, setMateriaFilter] = useState("todas");

  const navigate = useNavigate();

  // Debounce del buscador
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [rawQuery]);

  // Obtener instituciones desde backend
  const loadInstituciones = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/instituciones");
      setInstituciones(response.data || []);
      
      if (response.data && response.data.length > 0 && !institucionSeleccionada) {
        setInstitucionSeleccionada(response.data[0]);
      }
      setError(null);
    } catch (err) {
      console.error("Error al obtener instituciones:", err);
      setError("Error al cargar las instituciones");
      setInstituciones([]);
    } finally {
      setLoading(false);
      setRefreshLoading(false);
    }
  };

  // Obtener juzgados del Órgano Judicial
  const loadJuzgados = async () => {
    try {
      setJuzgadosLoading(true);
      setJuzgadosError(null);
      const response = await api.get("/juzgados");
      setJuzgados(response.data || []);
    } catch (err) {
      console.error("Error al obtener juzgados:", err);
      setJuzgadosError("Error al cargar los juzgados del Órgano Judicial");
      setJuzgados([]);
    } finally {
      setJuzgadosLoading(false);
    }
  };

  useEffect(() => {
    loadInstituciones();
  }, []);

  // Cargar juzgados cuando se cambia a la pestaña
  useEffect(() => {
    if (tabValue === 1 && juzgados.length === 0 && !juzgadosLoading) {
      loadJuzgados();
    }
  }, [tabValue]);

  const handleRefresh = () => {
    setRefreshLoading(true);
    if (tabValue === 0) {
      loadInstituciones();
    } else {
      loadJuzgados();
      setRefreshLoading(false);
    }
  };

  // Filtrar instituciones por búsqueda
  const filtered = useMemo(() => {
    if (!query) return instituciones;
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return instituciones.filter((inst) => {
      const texto = `${inst.nombre || ''} ${inst.direcciones?.map(d => d.direccion).join(' ') || ''} ${inst.direcciones?.map(d => d.contacto).join(' ') || ''}`.toLowerCase();
      return tokens.every((t) => texto.includes(t));
    });
  }, [instituciones, query]);

  // Filtrar juzgados por búsqueda y materia
  const filteredJuzgados = useMemo(() => {
    let result = juzgados;

    // Filtrar por materia
    if (materiaFilter !== "todas") {
      result = result.filter(j => j.materia?.toLowerCase().includes(materiaFilter.toLowerCase()));
    }

    // Filtrar por búsqueda
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
  const juzgadosStats = useMemo(() => {
    const total = juzgados.length;
    const porMateria = {};
    juzgados.forEach(j => {
      const mat = j.materia || "Sin materia";
      porMateria[mat] = (porMateria[mat] || 0) + 1;
    });
    return { total, porMateria };
  }, [juzgados]);

  // Acciones
  const handleVer = (id) => navigate(`/superadmin/instituciones/${id}`);
  const handleEditar = (id) => navigate(`/superadmin/instituciones/editar/${id}`);
  const handleNueva = () => navigate("/superadmin/instituciones/nueva");

  const handleEliminarClick = (institucion) => {
    setDeleteDialog({ open: true, institucion });
  };

  const handleEliminarConfirm = async () => {
    if (!deleteDialog.institucion) return;
    
    try {
      await api.delete(`/instituciones/${deleteDialog.institucion.id}`);
      setInstituciones(prev => prev.filter(inst => inst.id !== deleteDialog.institucion.id));
      
      if (institucionSeleccionada?.id === deleteDialog.institucion.id) {
        const nuevasInstituciones = instituciones.filter(inst => inst.id !== deleteDialog.institucion.id);
        if (nuevasInstituciones.length > 0) {
          setInstitucionSeleccionada(nuevasInstituciones[0]);
        } else {
          setInstitucionSeleccionada(null);
        }
      }
      
      setDeleteDialog({ open: false, institucion: null });
    } catch (err) {
      console.error("Error al eliminar institución:", err);
      alert(err.response?.data?.message || "Error al eliminar la institución.");
    }
  };

  const handleSelectInstitucion = (institucion) => {
    setInstitucionSeleccionada(institucion);
    setMobileDrawerOpen(false);
  };

  // Estadísticas de instituciones
  const stats = useMemo(() => {
    const total = instituciones.length;
    const totalDirecciones = instituciones.reduce((total, inst) => 
      total + (inst.direcciones?.filter(d => d.direccion || d.contacto).length || 0), 0
    );
    const conImagen = instituciones.filter(inst => inst.imagen).length;
    const sinDirecciones = instituciones.filter(inst => 
      !inst.direcciones?.length || inst.direcciones.every(d => !d.direccion && !d.contacto)
    ).length;

    return { total, totalDirecciones, conImagen, sinDirecciones };
  }, [instituciones]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh" flexDirection="column">
        <CircularProgress sx={{ color: "primary.main" }} />
        <Typography sx={{ mt: 2 }} color="text.secondary">Cargando instituciones...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
          <Business sx={{ mr: 2, verticalAlign: 'middle' }} />
          Gestión de Instituciones
        </Typography>
      </Box>

      {/* Pestañas: Instituciones / Juzgados del Órgano Judicial */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => {
            setTabValue(newValue);
            setRawQuery("");
            setJuzgadosPage(0);
          }}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', py: 2 }
          }}
        >
          <Tab 
            icon={<Business sx={{ mr: 1 }} />} 
            iconPosition="start"
            label={`Mis Instituciones (${instituciones.length})`} 
          />
          <Tab 
            icon={<Gavel sx={{ mr: 1 }} />} 
            iconPosition="start"
            label={`Juzgados - Órgano Judicial ${juzgados.length > 0 ? `(${juzgados.length})` : ''}`} 
          />
        </Tabs>
      </Card>

      {/* ==================== PESTAÑA 0: INSTITUCIONES (original) ==================== */}
      <TabPanel value={tabValue} index={0}>
        {/* Cards de estadísticas */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ textAlign: 'center', p: 2, backgroundColor: 'primary.main', color: 'white' }}>
              <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
              <Typography variant="body2">Total Instituciones</Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ textAlign: 'center', p: 2, backgroundColor: 'secondary.main', color: 'white' }}>
              <Typography variant="h4" fontWeight="bold">{stats.totalDirecciones}</Typography>
              <Typography variant="body2">Direcciones</Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ textAlign: 'center', p: 2, backgroundColor: 'success.main', color: 'white' }}>
              <Typography variant="h4" fontWeight="bold">{stats.conImagen}</Typography>
              <Typography variant="body2">Con Imagen</Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ textAlign: 'center', p: 2, backgroundColor: stats.sinDirecciones > 0 ? 'warning.main' : 'grey.500', color: 'white' }}>
              <Typography variant="h4" fontWeight="bold">{stats.sinDirecciones}</Typography>
              <Typography variant="body2">Sin Direcciones</Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Barra de acciones y búsqueda */}
        <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar por nombre, dirección, contacto..."
                    value={rawQuery}
                    onChange={(e) => setRawQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: rawQuery && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setRawQuery("")}>
                            <Clear />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                  <Tooltip title="Filtrar">
                    <IconButton>
                      <FilterList />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, flexWrap: "wrap" }}>
                  <Tooltip title="Actualizar lista">
                    <IconButton onClick={handleRefresh} disabled={refreshLoading}>
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleNueva}
                    sx={{ 
                      borderRadius: 1,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    Nueva Institución
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {query && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Mostrando {filtered.length} de {instituciones.length} instituciones para: &quot;{query}&quot;
          </Alert>
        )}

        {/* Botón para mostrar panel de detalles en móvil */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<MenuIcon />}
            onClick={() => setMobileDrawerOpen(true)}
            fullWidth
          >
            Ver Lista de Instituciones ({filtered.length})
          </Button>
        </Box>

        {/* Layout principal: Lista + Mapa */}
        <Grid container spacing={3}>
          {/* Panel de lista de instituciones (izquierda) */}
          <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Card sx={{ height: 'calc(100vh - 280px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="h6" fontWeight="bold">
                    Lista de Instituciones
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {filtered.length} instituciones
                  </Typography>
                </Box>
                
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  {filtered.length > 0 ? (
                    filtered.map((inst) => {
                      const direccionesValidas = inst.direcciones?.filter(d => d.direccion || d.contacto) || [];
                      const isSelected = institucionSeleccionada?.id === inst.id;
                      
                      return (
                        <Box
                          key={inst.id}
                          sx={{
                            p: 2,
                            borderBottom: 1,
                            borderColor: 'divider',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'primary.light' : 'transparent',
                            '&:hover': {
                              backgroundColor: isSelected ? 'primary.light' : 'action.hover',
                            },
                            transition: 'background-color 0.2s'
                          }}
                          onClick={() => handleSelectInstitucion(inst)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar 
                              sx={{ 
                                bgcolor: isSelected ? 'primary.contrastText' : 'primary.main',
                                color: isSelected ? 'primary.main' : 'primary.contrastText',
                                width: 40,
                                height: 40,
                                fontSize: '0.875rem'
                              }}
                            >
                              {getInitials(inst.nombre)}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography 
                                variant="subtitle1" 
                                fontWeight={isSelected ? "bold" : "medium"}
                                color={isSelected ? "primary.contrastText" : "text.primary"}
                              >
                                {highlightText(inst.nombre, query)}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                <Chip 
                                  label={`${direccionesValidas.length} dir.`} 
                                  size="small" 
                                  color={direccionesValidas.length > 0 ? "success" : "warning"}
                                  variant="outlined"
                                  sx={{ fontSize: '0.625rem' }}
                                />
                                {inst.imagen && (
                                  <Chip 
                                    label="Imagen" 
                                    size="small" 
                                    color="info"
                                    variant="outlined"
                                    sx={{ fontSize: '0.625rem' }}
                                  />
                                )}
                              </Box>
                            </Box>
                            {isSelected && (
                              <Box sx={{ 
                                width: 8, 
                                height: 8, 
                                borderRadius: '50%', 
                                backgroundColor: 'primary.main' 
                              }} />
                            )}
                          </Box>
                          
                          {direccionesValidas.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, ml: 6 }}>
                              <LocationOn sx={{ fontSize: 14, color: 'text.secondary', mr: 1 }} />
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {direccionesValidas[0].direccion}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    })
                  ) : (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Business sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        {instituciones.length === 0 ? "No hay instituciones" : "No se encontraron resultados"}
                      </Typography>
                      {instituciones.length === 0 && (
                        <Button 
                          variant="contained" 
                          startIcon={<Add />}
                          onClick={handleNueva}
                          sx={{ mt: 2 }}
                        >
                          Crear Primera Institución
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Panel de mapa (derecha) */}
          <Grid item xs={12} md={8}>
            <MapaInstituciones 
              instituciones={instituciones}
              institucionSeleccionada={institucionSeleccionada}
              onSelectInstitucion={handleSelectInstitucion}
            />
          </Grid>
        </Grid>
      </TabPanel>

      {/* ==================== PESTAÑA 1: JUZGADOS DEL ÓRGANO JUDICIAL ==================== */}
      <TabPanel value={tabValue} index={1}>
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

        {/* Estadísticas de juzgados */}
        {juzgados.length > 0 && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: 'linear-gradient(135deg, #1565c0, #1976d2)', color: 'white' }}>
                <AccountBalance sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">{juzgadosStats.total}</Typography>
                <Typography variant="body2">Total Juzgados</Typography>
              </Card>
            </Grid>
            {Object.entries(juzgadosStats.porMateria).slice(0, 3).map(([materia, count]) => {
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
                    setJuzgadosPage(0);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: rawQuery && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => { setRawQuery(""); setJuzgadosPage(0); }}>
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
                      setJuzgadosPage(0);
                    }}
                  >
                    <MenuItem value="todas">Todas las materias</MenuItem>
                    {materiasUnicas.map(materia => (
                      <MenuItem key={materia} value={materia}>
                        {materia} ({juzgadosStats.porMateria[materia] || 0})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                  <Tooltip title="Actualizar desde sitio oficial">
                    <IconButton onClick={() => loadJuzgados()} disabled={juzgadosLoading}>
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                  <Chip
                    label={`${filteredJuzgados.length} resultados`}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {juzgadosError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {juzgadosError}
            <Button size="small" onClick={() => loadJuzgados()} sx={{ ml: 2 }}>
              Reintentar
            </Button>
          </Alert>
        )}

        {juzgadosLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="40vh" flexDirection="column">
            <CircularProgress sx={{ color: "primary.main" }} />
            <Typography sx={{ mt: 2 }} color="text.secondary">
              Obteniendo juzgados del Órgano Judicial...
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Consultando sitio oficial: lapaz.organojudicial.gob.bo
            </Typography>
          </Box>
        ) : (
          <>
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
                  {filteredJuzgados.length > 0 ? (
                    filteredJuzgados
                      .slice(juzgadosPage * juzgadosRowsPerPage, juzgadosPage * juzgadosRowsPerPage + juzgadosRowsPerPage)
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
                                {juzgadosPage * juzgadosRowsPerPage + index + 1}
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
              
              {filteredJuzgados.length > 0 && (
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  component="div"
                  count={filteredJuzgados.length}
                  rowsPerPage={juzgadosRowsPerPage}
                  page={juzgadosPage}
                  onPageChange={(e, newPage) => setJuzgadosPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setJuzgadosRowsPerPage(parseInt(e.target.value, 10));
                    setJuzgadosPage(0);
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
          </>
        )}
      </TabPanel>

      {/* Drawer para móvil */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        sx={{ 
          '& .MuiDrawer-paper': { 
            width: { xs: '100%', sm: 400 },
            maxWidth: '100%'
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">
              Instituciones ({filtered.length})
            </Typography>
            <IconButton onClick={() => setMobileDrawerOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </Box>
        
        <Box sx={{ overflow: 'auto' }}>
          {filtered.map((inst) => {
            const direccionesValidas = inst.direcciones?.filter(d => d.direccion || d.contacto) || [];
            const isSelected = institucionSeleccionada?.id === inst.id;
            
            return (
              <Box
                key={inst.id}
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'primary.light' : 'transparent',
                  '&:hover': {
                    backgroundColor: isSelected ? 'primary.light' : 'action.hover',
                  }
                }}
                onClick={() => handleSelectInstitucion(inst)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: isSelected ? 'primary.contrastText' : 'primary.main',
                      color: isSelected ? 'primary.main' : 'primary.contrastText',
                      width: 40,
                      height: 40
                    }}
                  >
                    {getInitials(inst.nombre)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography 
                      variant="subtitle1" 
                      fontWeight={isSelected ? "bold" : "medium"}
                    >
                      {inst.nombre}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Chip 
                        label={`${direccionesValidas.length} dir.`} 
                        size="small" 
                        color={direccionesValidas.length > 0 ? "success" : "warning"}
                        variant="outlined"
                        sx={{ fontSize: '0.625rem' }}
                      />
                    </Box>
                  </Box>
                </Box>
                
                {direccionesValidas.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, ml: 6 }}>
                    <LocationOn sx={{ fontSize: 14, color: 'text.secondary', mr: 1 }} />
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {direccionesValidas[0].direccion}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Drawer>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, institucion: null })}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="error" />
            Confirmar Eliminación
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar la institución{' '}
            <strong>&quot;{deleteDialog.institucion?.nombre}&quot;</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Esta acción no se puede deshacer.</strong><br/>
              Se eliminarán todas las direcciones asociadas a esta institución.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, institucion: null })}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleEliminarConfirm}
            startIcon={<Delete />}
          >
            Eliminar Institución
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
