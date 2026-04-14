import React, { useEffect, useState, useMemo } from "react";
import {
  Box, TextField, Button, Typography, Grid, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Autocomplete, Chip, Paper, Divider
} from "@mui/material";
import { Gavel, LocationOn, Save, ArrowBack } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";

// Color por materia (mismo que en JuzgadosList)
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

// Mapeo de materia del caso a materia de juzgados
// Ajustar según las materias usadas en el sistema
const MATERIAS_CASO = [
  "Penal",
  "Civil Comercial",
  "Familia",
  "Niñez y Adolescencia",
  "Trabajo y Seguridad Social",
  "Contravencional",
  "Violencia",
  "Anticorrupción",
  "Sustancias Controladas",
  "Instrucción Penal",
  "Ejecución Penal"
];

export default function CasoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  // Estado del formulario
  const [form, setForm] = useState({
    nurej_cud: "",
    delito: "",
    tipo_caso: "",
    asunto: "",
    fecha_ingreso: "",
    fecha_inicio: "",
    materia: "",
    clientes_id: "",
    estado: "activo",
    responsable_id: "",
    seguimiento: "NT-1",
    juzgado_nombre: "",
    juzgado_ubicacion: ""
  });

  const [juzgados, setJuzgados] = useState([]);
  const [juzgadosLoading, setJuzgadosLoading] = useState(false);
  const [juzgadoSeleccionado, setJuzgadoSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCaso, setLoadingCaso] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Cargar juzgados
  const loadJuzgados = async () => {
    try {
      setJuzgadosLoading(true);
      const response = await api.get("/juzgados");
      setJuzgados(response.data || []);
    } catch (err) {
      console.error("Error al cargar juzgados:", err);
    } finally {
      setJuzgadosLoading(false);
    }
  };

  // Cargar caso existente si estamos editando
  const loadCaso = async () => {
    if (!id) return;
    try {
      setLoadingCaso(true);
      const response = await api.get(`/casos/${id}`);
      const caso = response.data;
      setForm({
        nurej_cud: caso.nurej_cud || "",
        delito: caso.delito || "",
        tipo_caso: caso.tipo_caso || "",
        asunto: caso.asunto || "",
        fecha_ingreso: caso.fecha_ingreso ? caso.fecha_ingreso.split("T")[0] : "",
        fecha_inicio: caso.fecha_inicio ? caso.fecha_inicio.split("T")[0] : "",
        materia: caso.materia || "",
        clientes_id: caso.clientes_id || "",
        estado: caso.estado || "activo",
        responsable_id: caso.responsable_id || "",
        seguimiento: caso.seguimiento || "NT-1",
        juzgado_nombre: caso.juzgado_nombre || "",
        juzgado_ubicacion: caso.juzgado_ubicacion || ""
      });

      // Si el caso ya tiene un juzgado, preseleccionarlo cuando carguen los juzgados
      if (caso.juzgado_nombre) {
        setJuzgadoSeleccionado({
          nombre: caso.juzgado_nombre,
          ubicacion: caso.juzgado_ubicacion || ""
        });
      }
    } catch (err) {
      console.error("Error al cargar caso:", err);
      setError("Error al cargar los datos del caso");
    } finally {
      setLoadingCaso(false);
    }
  };

  useEffect(() => {
    loadJuzgados();
    if (isEditing) {
      loadCaso();
    }
  }, [id]);

  // Filtrar juzgados por la materia seleccionada en el caso
  const juzgadosFiltrados = useMemo(() => {
    if (!form.materia) return juzgados;

    const materiaLower = form.materia.toLowerCase();
    
    return juzgados.filter(juzgado => {
      const juzgadoMateria = (juzgado.materia || "").toLowerCase();
      
      // Mapeo flexible: buscar coincidencias parciales
      if (materiaLower.includes("penal") && !materiaLower.includes("instrucción") && !materiaLower.includes("ejecución")) {
        return juzgadoMateria.includes("penal") || juzgadoMateria.includes("sentencia penal");
      }
      if (materiaLower.includes("civil") || materiaLower.includes("comercial")) {
        return juzgadoMateria.includes("civil") || juzgadoMateria.includes("comercial");
      }
      if (materiaLower.includes("familia")) {
        return juzgadoMateria.includes("familia");
      }
      if (materiaLower.includes("niñez") || materiaLower.includes("adolescencia")) {
        return juzgadoMateria.includes("niñez") || juzgadoMateria.includes("adolescencia");
      }
      if (materiaLower.includes("trabajo") || materiaLower.includes("seguridad social")) {
        return juzgadoMateria.includes("trabajo") || juzgadoMateria.includes("seguridad");
      }
      if (materiaLower.includes("contravencional")) {
        return juzgadoMateria.includes("contravencional");
      }
      if (materiaLower.includes("violencia")) {
        return juzgadoMateria.includes("violencia");
      }
      if (materiaLower.includes("anticorrupción") || materiaLower.includes("anticorrupcion")) {
        return juzgadoMateria.includes("anticorrupción") || juzgadoMateria.includes("anticorrupcion");
      }
      if (materiaLower.includes("sustancias")) {
        return juzgadoMateria.includes("sustancias");
      }
      if (materiaLower.includes("instrucción")) {
        return juzgadoMateria.includes("instrucción") || juzgadoMateria.includes("instruccion");
      }
      if (materiaLower.includes("ejecución")) {
        return juzgadoMateria.includes("ejecución") || juzgadoMateria.includes("ejecucion");
      }
      
      // Fallback: coincidencia parcial directa
      return juzgadoMateria.includes(materiaLower) || materiaLower.includes(juzgadoMateria);
    });
  }, [juzgados, form.materia]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));

    // Si cambia la materia, limpiar juzgado seleccionado
    if (field === "materia") {
      setJuzgadoSeleccionado(null);
      setForm(prev => ({ ...prev, juzgado_nombre: "", juzgado_ubicacion: "" }));
    }
  };

  const handleJuzgadoSelect = (event, juzgado) => {
    setJuzgadoSeleccionado(juzgado);
    if (juzgado) {
      setForm(prev => ({
        ...prev,
        juzgado_nombre: juzgado.nombre,
        juzgado_ubicacion: juzgado.ubicacion || ""
      }));
    } else {
      setForm(prev => ({
        ...prev,
        juzgado_nombre: "",
        juzgado_ubicacion: ""
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isEditing) {
        await api.put(`/casos/${id}`, form);
        setSuccess("Caso actualizado exitosamente");
      } else {
        await api.post("/casos", form);
        setSuccess("Caso creado exitosamente");
      }

      setTimeout(() => {
        navigate(-1);
      }, 1500);
    } catch (err) {
      console.error("Error al guardar caso:", err);
      setError(err.response?.data?.message || "Error al guardar el caso");
    } finally {
      setLoading(false);
    }
  };

  if (loadingCaso) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando datos del caso...</Typography>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 900, mx: "auto", py: 3, px: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ textTransform: 'none' }}
        >
          Volver
        </Button>
        <Typography variant="h5" fontWeight="bold" color="primary.main">
          {isEditing ? "Editar Caso" : "Nuevo Caso"}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Datos principales del caso */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Datos del Caso
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="NUREJ/CUD"
                    value={form.nurej_cud}
                    onChange={handleChange("nurej_cud")}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Delito *"
                    value={form.delito}
                    onChange={handleChange("delito")}
                    required
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tipo de Caso *"
                    value={form.tipo_caso}
                    onChange={handleChange("tipo_caso")}
                    required
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Estado</InputLabel>
                    <Select
                      value={form.estado}
                      label="Estado"
                      onChange={handleChange("estado")}
                    >
                      <MenuItem value="activo">Activo</MenuItem>
                      <MenuItem value="en_proceso">En Proceso</MenuItem>
                      <MenuItem value="cerrado">Cerrado</MenuItem>
                      <MenuItem value="archivado">Archivado</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Asunto *"
                    value={form.asunto}
                    onChange={handleChange("asunto")}
                    required
                    multiline
                    rows={2}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Fecha de Ingreso"
                    type="date"
                    value={form.fecha_ingreso}
                    onChange={handleChange("fecha_ingreso")}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Fecha de Inicio"
                    type="date"
                    value={form.fecha_inicio}
                    onChange={handleChange("fecha_inicio")}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Sección de Materia y Juzgado */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                <Gavel sx={{ mr: 1, verticalAlign: 'middle' }} />
                Materia y Juzgado
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Selecciona la materia del caso para filtrar los juzgados disponibles.
              </Typography>

              <Grid container spacing={2}>
                {/* Selector de materia */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Materia del Caso</InputLabel>
                    <Select
                      value={form.materia}
                      label="Materia del Caso"
                      onChange={handleChange("materia")}
                    >
                      <MenuItem value="">
                        <em>Sin materia</em>
                      </MenuItem>
                      {MATERIAS_CASO.map(materia => {
                        const colorInfo = getMateriaColor(materia);
                        return (
                          <MenuItem key={materia} value={materia}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ 
                                width: 12, height: 12, borderRadius: '50%', 
                                backgroundColor: colorInfo.color 
                              }} />
                              {materia}
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Indicador de juzgados disponibles */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    {form.materia ? (
                      <Chip
                        icon={<Gavel />}
                        label={`${juzgadosFiltrados.length} juzgados disponibles para ${form.materia}`}
                        color={juzgadosFiltrados.length > 0 ? "primary" : "warning"}
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Selecciona una materia para ver juzgados filtrados
                      </Typography>
                    )}
                  </Box>
                </Grid>

                {/* Selector de juzgado (Autocomplete) */}
                <Grid item xs={12}>
                  <Autocomplete
                    options={juzgadosFiltrados}
                    value={juzgadoSeleccionado}
                    onChange={handleJuzgadoSelect}
                    loading={juzgadosLoading}
                    getOptionLabel={(option) => option.nombre || ""}
                    isOptionEqualToValue={(option, value) => option.nombre === value.nombre}
                    noOptionsText={
                      form.materia 
                        ? "No hay juzgados para esta materia" 
                        : "Selecciona una materia primero"
                    }
                    renderOption={(props, option) => {
                      const colorInfo = getMateriaColor(option.materia);
                      return (
                        <li {...props} key={`${option.id}-${option.nombre}`}>
                          <Box sx={{ width: '100%', py: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Gavel sx={{ fontSize: 16, color: colorInfo.color }} />
                              <Typography variant="body2" fontWeight="bold">
                                {option.nombre}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 3, mt: 0.5 }}>
                              <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {option.ubicacion || "Sin ubicación"}
                              </Typography>
                            </Box>
                            <Box sx={{ ml: 3, mt: 0.5 }}>
                              <Chip
                                label={colorInfo.label}
                                size="small"
                                sx={{
                                  backgroundColor: colorInfo.bg,
                                  color: colorInfo.color,
                                  fontSize: '0.65rem',
                                  height: 20
                                }}
                              />
                              <Chip
                                label={option.lugar}
                                size="small"
                                variant="outlined"
                                sx={{ ml: 0.5, fontSize: '0.65rem', height: 20 }}
                              />
                            </Box>
                          </Box>
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Juzgado asignado"
                        placeholder={form.materia ? "Buscar juzgado..." : "Primero selecciona una materia"}
                        size="small"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <Gavel sx={{ fontSize: 20, color: 'action.active', mr: 1 }} />
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>

                {/* Mostrar juzgado seleccionado */}
                {juzgadoSeleccionado && (
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f8f9fa' }}>
                      <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                        <Gavel sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                        Juzgado seleccionado:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>{juzgadoSeleccionado.nombre}</strong>
                      </Typography>
                      {juzgadoSeleccionado.ubicacion && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          <LocationOn sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                          {juzgadoSeleccionado.ubicacion}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Botones de acción */}
        <Grid item xs={12}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              sx={{ textTransform: 'none' }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
              disabled={loading}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {loading ? (
                <CircularProgress size={24} />
              ) : (
                isEditing ? "Guardar Cambios" : "Crear Caso"
              )}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
