import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Paper,
  Tooltip,
  useTheme
} from '@mui/material';
import { useUnitSystem } from '../../utils/unitUtils';

/**
 * A visual barbell plate calculator component
 * Shows which plates need to be added to each side of a barbell
 */
const PlateCalculator = ({ targetWeight }) => {
  const theme = useTheme();
  const { calculatePlates, weightUnit, unitSystem } = useUnitSystem();
  
  // Get bar weight based on unit system
  const barWeight = unitSystem === 'metric' ? 20 : 45;
  
  // Round target weight to nearest 0.5 or 1.0 to avoid floating point issues
  const roundedWeight = Math.round(targetWeight * 2) / 2;
  
  // Calculate plates needed
  const plates = calculatePlates(roundedWeight);
  
  // If no plates needed or weight less than bar
  if ((!roundedWeight || roundedWeight <= barWeight) && plates.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" align="center" color="text.secondary" gutterBottom>
          Plate Calculator
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary">
          {!roundedWeight || roundedWeight === 0 
            ? 'No weight specified'
            : `Weight (${roundedWeight} ${weightUnit}) is less than or equal to bar weight (${barWeight} ${weightUnit})`}
        </Typography>
      </Paper>
    );
  }

  // Get plate colors based on weight
  const getPlateColor = (weight) => {
    if (unitSystem === 'metric') {
      if (weight === 25 || weight === 20) return '#ff0000'; // Red
      if (weight === 15) return '#ffff00'; // Yellow
      if (weight === 10) return '#00ff00'; // Green
      if (weight === 5) return '#ffffff'; // White
      if (weight === 2.5) return '#0000ff'; // Blue
      if (weight === 1.25) return '#00ffff'; // Cyan
      return '#cccccc'; // Gray for smaller plates
    } else {
      if (weight === 45) return '#ff0000'; // Red
      if (weight === 25) return '#0000ff'; // Blue
      if (weight === 10) return '#00ff00'; // Green
      if (weight === 5) return '#ffffff'; // White
      if (weight === 2.5) return '#ffff00'; // Yellow
      return '#cccccc'; // Gray for other weights
    }
  };

  // Calculate total plate weight (just one side)
  const totalPlateWeight = plates.reduce((acc, weight) => acc + weight, 0);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" align="center" gutterBottom>
        Plate Calculator
      </Typography>
      
      <Typography variant="body2" align="center" sx={{ mb: 2 }} color="text.secondary">
        {roundedWeight} {weightUnit} = {barWeight} {weightUnit} bar + {totalPlateWeight * 2} {weightUnit} plates ({totalPlateWeight} {weightUnit} per side)
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 1 }}>
        {/* Bar */}
        <Box sx={{ 
          height: '10px', 
          width: '200px', 
          bgcolor: '#888',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
          borderRadius: '5px'
        }}>
          <Tooltip title={`${barWeight} ${weightUnit} bar`}>
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
              BAR
            </Typography>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Plates visualization - ONE SIDE ONLY */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', my: 1 }}>
        {/* Center collar */}
        <Box sx={{ 
          height: '24px', 
          width: '10px', 
          bgcolor: '#555',
          mx: 0.5,
          borderRadius: '4px',
          zIndex: 2
        }} />
        
        {/* Right side plates only (one side) */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          {plates.map((weight, index) => (
            <Tooltip key={`plate-${index}`} title={`${weight} ${weightUnit}`}>
              <Box sx={{ 
                height: Math.max(30, Math.min(80, weight * 1.5)), 
                width: Math.max(6, Math.min(14, weight / 2)),
                bgcolor: getPlateColor(weight),
                border: '1px solid #000',
                ml: 0.5,
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {weight >= 10 && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      transform: 'rotate(-90deg)', 
                      fontSize: weight >= 20 ? '0.7rem' : '0.6rem',
                      fontWeight: 'bold',
                      color: weight === 5 || weight === 2.5 ? '#000' : '#fff'
                    }}
                  >
                    {weight}
                  </Typography>
                )}
              </Box>
            </Tooltip>
          ))}
        </Box>
      </Box>
      
      {/* Legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', mt: 2 }}>
        {plates.filter((value, index, self) => self.indexOf(value) === index).map((weight) => (
          <Box key={weight} sx={{ display: 'flex', alignItems: 'center', mx: 1, mb: 1 }}>
            <Box sx={{ 
              width: '10px', 
              height: '10px', 
              bgcolor: getPlateColor(weight), 
              border: '1px solid #000',
              mr: 0.5 
            }} />
            <Typography variant="caption">
              {weight} {weightUnit} ({plates.filter(p => p === weight).length} per side)
            </Typography>
          </Box>
        ))}
      </Box>
      
      <Typography variant="caption" align="center" sx={{ display: 'block', mt: 1 }} color="text.secondary">
        Add plates shown above to each side of the barbell
      </Typography>
    </Paper>
  );
};

PlateCalculator.propTypes = {
  targetWeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};

export default PlateCalculator;