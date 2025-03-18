// Update session data after loading
useEffect(() => {
  if (session?.exercises) {
    // REMOVED: This was causing the "Infinity lb" issue by converting already converted weights
    // const mappedExercises = session.exercises.map(exercise => ({
    //   ...exercise,
    //   target_weight: exercise.target_weight ? convertToPreferred(exercise.target_weight, 'kg') : exercise.target_weight
    // }));
    
    // setSession(prev => ({
    //   ...prev,
    //   exercises: mappedExercises
    // }));

    // We've removed the second conversion because the weights are already properly converted 
    // during the initial data load in the previous useEffect
    console.log('Session exercises updated, skipping redundant weight conversion');
  }
}, [session?.exercises, convertToPreferred]); 