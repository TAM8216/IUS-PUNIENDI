import React, { useEffect, useState, useMemo } from "react";
import {
  Box, TextField, Button, Typography, Grid, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Autocomplete, Chip, Paper, InputAdornment, ListSubheader
} from "@mui/material";
import {
  Gavel, LocationOn, Save, ArrowBack, Search, AccountBalance
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";

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

  // Filtrar juzgados por la materia seleccionada
  const juzgadosFiltrados = useMemo(() => {
    if (!form.materia) return juzgados;
    const materiaLower = form.materia.toLowerCase();

    return juzgados.filter(juzgado => {
      const jm = (juzgado.materia || "").toLowerCase();
      if (materiaLower.includes("penal") && !materiaLower.includes("instrucción") && !materiaLower.includes("ejecución")) {
        return jm.includes("penal") || jm.includes("sentencia penal");
      }
      if (materiaLower.includes("civil") || materiaLower.includes("comercial")) {
        return jm.includes("civil") || jm.includes("comercial");
      }
      if (materiaLower.includes("familia")) return jm.includes("familia");
      if (materiaLower.includes("niñez") || materiaLower.includes("adolescencia")) {
        return jm.includes("niñez") || jm.includes("adolescencia");
      }
      if (materiaLower.includes("trabajo") || materiaLower.includes("seguridad social")) {
        return jm.includes("trabajo") || jm.includes("seguridad");
      }
      if (materiaLower.includes("contravencional")) return jm.includes("contravencional");
      if (materiaLower.includes("violencia")) return jm.includes("violencia");
      if (materiaLower.includes("anticorrupción") || materiaLower.includes("anticorrupcion")) {
        return jm.includes("anticorrupción") || jm.includes("anticorrupcion");
      }
      if (materiaLower.includes("sustancias")) return jm.includes("sustancias");
      if (materiaLower.includes("instrucción")) {
        return jm.includes("instrucción") || jm.includes("instruccion");
      }
      if (materiaLower.includes("ejecución")) {
        return jm.includes("ejecución") || jm.includes("ejecucion");
      }
      return jm.includes(materiaLower) || materiaLower.includes(jm);
    });
  }, [juzgados, form.materia]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === "materia") {
      setJuzgadoSeleccionado(null);
      setForm(prev => ({ ...prev, [field]: value, juzgado_nombre: "", juzgado_ubicacion: "" }));
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
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      console.error("Error al guardar caso:", err);
      setError(err.response?.data?.message || "Error al guardar el caso");
    } finally {
      setLoading(false);
    }
  };

  if (loadingCaso) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh" flexDirection="column">
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Cargando datos del caso...</Typography>
      </Box>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ maxWidth: 960, mx: "auto", py: 4, px: { xs: 2, sm: 3 } }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 4, gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ textTransform: "none", minWidth: 100 }}
        >
          Volver
        </Button>
        <Typography variant="h5" fontWeight="bold" color="primary.main">
          {isEditing ? "Editar Caso" : "Nuevo Caso"}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      {/* ── Sección 1: Datos del Caso ────────────────────── */}
      <Card sx={{ borderRadius: 2, boxShadow: 2, mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            Datos del Caso
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="NUREJ / CUD"
                value={form.nurej_cud}
                onChange={handleChange("nurej_cud")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Delito"
                value={form.delito}
                onChange={handleChange("delito")}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tipo de Caso"
                value={form.tipo_caso}
                onChange={handleChange("tipo_caso")}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
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
                label="Asunto"
                value={form.asunto}
                onChange={handleChange("asunto")}
                required
                multiline
                minRows={2}
                maxRows={4}
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
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── Sección 2: Materia y Juzgado ────────────────── */}
      <Card sx={{ borderRadius: 2, boxShadow: 2, mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Gavel sx={{ color: "primary.main" }} />
            <Typography variant="subtitle1" fontWeight="bold">
              Materia y Juzgado
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Selecciona primero la materia para filtrar los juzgados disponibles.
          </Typography>

          <Grid container spacing={2}>
            {/* Materia */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
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
                    const c = getMateriaColor(materia);
                    return (
                      <MenuItem key={materia} value={materia}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              backgroundColor: c.color,
                              flexShrink: 0
                            }}
                          />
                          <Typography variant="body2">{materia}</Typography>
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>

            {/* Badge de juzgados disponibles */}
            <Grid item xs={12} sm={6}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  height: "100%",
                  minHeight: 56
                }}
              >
                {form.materia ? (
                  <Chip
                    icon={<AccountBalance />}
                    label={`${juzgadosFiltrados.length} juzgados en ${form.materia}`}
                    color={juzgadosFiltrados.length > 0 ? "primary" : "warning"}
                    variant="outlined"
                    sx={{ fontWeight: 500 }}
                  />
                ) : (
                  <Typography variant="body2" color="text.disabled">
                    Selecciona una materia para ver juzgados
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* Autocomplete de juzgados */}
            <Grid item xs={12}>
              <Autocomplete
                options={juzgadosFiltrados}
                value={juzgadoSeleccionado}
                onChange={handleJuzgadoSelect}
                loading={juzgadosLoading}
                getOptionLabel={(option) => option.nombre || ""}
                isOptionEqualToValue={(option, value) => option.nombre === value.nombre}
                filterOptions={(options, { inputValue }) => {
                  if (!inputValue) return options;
                  const terms = inputValue.toLowerCase().split(/\s+/).filter(Boolean);
                  return options.filter(opt => {
                    const text = `${opt.nombre} ${opt.lugar} ${opt.edificio} ${opt.calle}`.toLowerCase();
                    return terms.every(t => text.includes(t));
                  });
                }}
                noOptionsText={
                  form.materia
                    ? "No se encontraron juzgados"
                    : "Selecciona una materia primero"
                }
                ListboxProps={{
                  sx: { maxHeight: 320, "& .MuiAutocomplete-option": { px: 2, py: 1.5 } }
                }}
                renderOption={(props, option) => {
                  const c = getMateriaColor(option.materia);
                  return (
                    <li {...props} key={`${option.id}-${option.nombre}`}>
                      <Box sx={{ width: "100%" }}>
                        {/* Row 1: name */}
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {option.nombre}
                        </Typography>

                        {/* Row 2: location */}
                        {option.ubicacion && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              mt: 0.5
                            }}
                          >
                            <LocationOn sx={{ fontSize: 14, color: "text.secondary" }} />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                              sx={{ maxWidth: "90%" }}
                            >
                              {option.ubicacion}
                            </Typography>
                          </Box>
                        )}

                        {/* Row 3: chips */}
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                          <Chip
                            label={c.label}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.68rem",
                              fontWeight: 600,
                              backgroundColor: c.bg,
                              color: c.color
                            }}
                          />
                          {option.lugar && (
                            <Chip
                              label={option.lugar}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.68rem" }}
                            />
                          )}
                        </Box>
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Buscar y seleccionar juzgado"
                    placeholder={
                      form.materia
                        ? "Escribe para buscar por nombre, lugar o edificio..."
                        : "Primero selecciona una materia"
                    }
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ color: "action.active" }} />
                        </InputAdornment>
                      )
                    }}
                    helperText={
                      form.materia
                        ? `Puedes buscar entre ${juzgadosFiltrados.length} juzgados de ${form.materia}`
                        : undefined
                    }
                  />
                )}
              />
            </Grid>

            {/* Juzgado seleccionado — card de confirmación */}
            {juzgadoSeleccionado && (
              <Grid item xs={12}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderColor: "primary.main",
                    borderWidth: 2,
                    backgroundColor: "primary.50",
                    borderRadius: 2
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <AccountBalance sx={{ color: "primary.main", fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                      Juzgado seleccionado
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight={600} sx={{ ml: 3.5 }}>
                    {juzgadoSeleccionado.nombre}
                  </Typography>
                  {juzgadoSeleccionado.ubicacion && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 3.5, mt: 0.5 }}>
                      <LocationOn sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary">
                        {juzgadoSeleccionado.ubicacion}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* ── Botones de acción ───────────────────────────── */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => navigate(-1)}
          sx={{ textTransform: "none", minWidth: 120 }}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
          disabled={loading}
          sx={{ textTransform: "none", fontWeight: 600, minWidth: 160 }}
        >
          {isEditing ? "Guardar Cambios" : "Crear Caso"}
        </Button>
      </Box>
    </Box>
  );
}
