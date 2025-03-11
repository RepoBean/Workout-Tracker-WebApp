"""
Exercise Library for Workout Tracker Application.
This module contains seed data for exercises and workout plans.
"""

# Define muscle groups for better organization
MUSCLE_GROUPS = {
    "chest": "Chest",
    "back": "Back",
    "legs": "Legs",
    "shoulders": "Shoulders",
    "arms": "Arms",
    "core": "Core"
}

# Define secondary muscle groups
SECONDARY_MUSCLE_GROUPS = {
    "biceps": "Biceps",
    "triceps": "Triceps",
    "forearms": "Forearms",
    "calves": "Calves",
    "hamstrings": "Hamstrings",
    "quadriceps": "Quadriceps",
    "glutes": "Glutes",
    "traps": "Trapezius",
    "lats": "Latissimus Dorsi",
    "abs": "Abdominals",
    "obliques": "Obliques",
    "lower_back": "Lower Back",
    "front_delts": "Front Deltoids",
    "side_delts": "Side Deltoids",
    "rear_delts": "Rear Deltoids",
    "pecs": "Pectorals",
    "hip_flexors": "Hip Flexors",
    "shoulders": "Shoulders"
}

# Equipment categories
EQUIPMENT = {
    "bodyweight": "Bodyweight",
    "dumbbell": "Dumbbells",
    "barbell": "Barbell",
    "cable": "Cable Machine",
    "machine": "Machine",
    "kettlebell": "Kettlebell",
    "resistance_band": "Resistance Band",
    "medicine_ball": "Medicine Ball",
    "stability_ball": "Stability Ball",
    "foam_roller": "Foam Roller",
    "bench": "Bench",
    "pullup_bar": "Pull-up Bar",
    "trx": "TRX/Suspension Trainer"
}

# Progression types
PROGRESSION_TYPES = {
    "weight": "Increase weight",
    "reps": "Increase reps",
    "sets": "Increase sets",
    "time": "Increase time",
    "difficulty": "Increase difficulty"
}

# Exercise categories
CATEGORIES = {
    "compound": "Compound",
    "isolation": "Isolation",
    "cardio": "Cardiovascular",
    "flexibility": "Flexibility",
    "balance": "Balance",
    "plyometric": "Plyometric"
}

# Helper function to create an exercise entry
def create_exercise(name, description, category, equipment, primary_muscle, secondary_muscles, 
                    instructions, difficulty, weight_rec, progression):
    return {
        "name": name,
        "description": description,
        "category": category,
        "equipment": equipment,
        "primary_muscle_group": primary_muscle,
        "secondary_muscle_groups": secondary_muscles,
        "instructions": instructions,
        "difficulty": difficulty,
        "weight_recommendation": weight_rec,
        "progression_scheme": progression
    }

# Exercise library - comprehensive collection of exercises
CHEST_EXERCISES = [
    create_exercise(
        "Bench Press",
        "Classic chest compound exercise",
        CATEGORIES["compound"],
        EQUIPMENT["barbell"],
        MUSCLE_GROUPS["chest"],
        [SECONDARY_MUSCLE_GROUPS["triceps"], SECONDARY_MUSCLE_GROUPS["front_delts"]],
        "Lie on a bench, grasp the barbell with hands slightly wider than shoulder-width. Lower the bar to mid-chest and press back up to starting position.",
        "Intermediate",
        {
            "beginner": {"male": "45-95 lbs", "female": "30-45 lbs"},
            "intermediate": {"male": "135-185 lbs", "female": "45-95 lbs"},
            "advanced": {"male": "225+ lbs", "female": "135+ lbs"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Dumbbell Bench Press",
        "Chest compound exercise with dumbbells for better range of motion",
        CATEGORIES["compound"],
        EQUIPMENT["dumbbell"],
        MUSCLE_GROUPS["chest"],
        [SECONDARY_MUSCLE_GROUPS["triceps"], SECONDARY_MUSCLE_GROUPS["front_delts"]],
        "Lie on a bench with a dumbbell in each hand at chest level. Press the weights up until arms are extended, then lower back to starting position.",
        "Beginner",
        {
            "beginner": {"male": "15-25 lbs each", "female": "5-15 lbs each"},
            "intermediate": {"male": "30-50 lbs each", "female": "15-25 lbs each"},
            "advanced": {"male": "60+ lbs each", "female": "30+ lbs each"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Push-up",
        "Bodyweight chest exercise",
        CATEGORIES["compound"],
        EQUIPMENT["bodyweight"],
        MUSCLE_GROUPS["chest"],
        [SECONDARY_MUSCLE_GROUPS["triceps"], SECONDARY_MUSCLE_GROUPS["front_delts"], SECONDARY_MUSCLE_GROUPS["abs"]],
        "Start in plank position with hands slightly wider than shoulders. Lower body until chest nearly touches floor, then push back up.",
        "Beginner",
        {
            "beginner": "Bodyweight (knees on floor for easier variation)",
            "intermediate": "Bodyweight",
            "advanced": "Elevated feet or weighted vest"
        },
        PROGRESSION_TYPES["difficulty"]
    ),
    create_exercise(
        "Incline Bench Press",
        "Targets upper chest with an angled bench",
        CATEGORIES["compound"],
        EQUIPMENT["barbell"],
        MUSCLE_GROUPS["chest"],
        [SECONDARY_MUSCLE_GROUPS["front_delts"], SECONDARY_MUSCLE_GROUPS["triceps"]],
        "Set bench to 15-30 degree incline. Lie on bench and grip barbell slightly wider than shoulder width. Lower bar to upper chest and press back up.",
        "Intermediate",
        {
            "beginner": {"male": "45-85 lbs", "female": "30-40 lbs"},
            "intermediate": {"male": "95-155 lbs", "female": "45-75 lbs"},
            "advanced": {"male": "185+ lbs", "female": "95+ lbs"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Cable Crossover",
        "Isolation exercise for chest with constant tension",
        CATEGORIES["isolation"],
        EQUIPMENT["cable"],
        MUSCLE_GROUPS["chest"],
        [SECONDARY_MUSCLE_GROUPS["front_delts"]],
        "Stand between cable stations with handles attached to high pulleys. Step forward, arms extended to sides. Pull handles down and across body in arc motion, squeezing chest at finish.",
        "Intermediate",
        {
            "beginner": {"male": "10-15 lbs each side", "female": "5-10 lbs each side"},
            "intermediate": {"male": "20-30 lbs each side", "female": "10-15 lbs each side"},
            "advanced": {"male": "35+ lbs each side", "female": "20+ lbs each side"}
        },
        PROGRESSION_TYPES["weight"]
    ),
]

BACK_EXERCISES = [
    create_exercise(
        "Pull-up",
        "Upper body compound pulling exercise",
        CATEGORIES["compound"],
        EQUIPMENT["pullup_bar"],
        MUSCLE_GROUPS["back"],
        [SECONDARY_MUSCLE_GROUPS["biceps"], SECONDARY_MUSCLE_GROUPS["forearms"]],
        "Hang from a pull-up bar with hands wider than shoulder width. Pull your body up until your chin clears the bar, then lower back to starting position with control.",
        "Intermediate",
        {
            "beginner": "Assisted with band or machine",
            "intermediate": "Bodyweight",
            "advanced": "Weighted with belt (10-45+ lbs)"
        },
        PROGRESSION_TYPES["reps"]
    ),
    create_exercise(
        "Bent Over Row",
        "Compound back exercise with barbell",
        CATEGORIES["compound"],
        EQUIPMENT["barbell"],
        MUSCLE_GROUPS["back"],
        [SECONDARY_MUSCLE_GROUPS["biceps"], SECONDARY_MUSCLE_GROUPS["rear_delts"], SECONDARY_MUSCLE_GROUPS["lower_back"]],
        "Bend at hips until torso is nearly parallel to floor, knees slightly bent. Grasp barbell with overhand grip and pull to lower chest, squeezing shoulder blades. Lower with control.",
        "Intermediate",
        {
            "beginner": {"male": "45-65 lbs", "female": "30-45 lbs"},
            "intermediate": {"male": "95-135 lbs", "female": "45-75 lbs"},
            "advanced": {"male": "185+ lbs", "female": "95+ lbs"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Deadlift",
        "Compound exercise for total back development",
        CATEGORIES["compound"],
        EQUIPMENT["barbell"],
        MUSCLE_GROUPS["back"],
        [SECONDARY_MUSCLE_GROUPS["hamstrings"], SECONDARY_MUSCLE_GROUPS["glutes"], SECONDARY_MUSCLE_GROUPS["lower_back"], SECONDARY_MUSCLE_GROUPS["traps"]],
        "Stand with feet hip-width apart and barbell over midfoot. Bend at hips and knees to grasp bar. Keeping back flat, stand up by extending hips and knees.",
        "Advanced",
        {
            "beginner": {"male": "95-135 lbs", "female": "65-85 lbs"},
            "intermediate": {"male": "185-275 lbs", "female": "95-155 lbs"},
            "advanced": {"male": "315+ lbs", "female": "185+ lbs"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Lat Pulldown",
        "Machine exercise targeting latissimus dorsi",
        CATEGORIES["compound"],
        EQUIPMENT["cable"],
        MUSCLE_GROUPS["back"],
        [SECONDARY_MUSCLE_GROUPS["biceps"], SECONDARY_MUSCLE_GROUPS["forearms"]],
        "Sit at lat pulldown machine with thighs secured. Grasp bar with wide grip and pull down to upper chest while squeezing shoulder blades. Return to start with control.",
        "Beginner",
        {
            "beginner": {"male": "70-100 lbs", "female": "40-70 lbs"},
            "intermediate": {"male": "110-150 lbs", "female": "70-100 lbs"},
            "advanced": {"male": "160+ lbs", "female": "110+ lbs"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Seated Cable Row",
        "Machine back exercise with constant tension",
        CATEGORIES["compound"],
        EQUIPMENT["cable"],
        MUSCLE_GROUPS["back"],
        [SECONDARY_MUSCLE_GROUPS["biceps"], SECONDARY_MUSCLE_GROUPS["rear_delts"]],
        "Sit at cable row station with feet on platform and knees slightly bent. Grasp handle, sit upright, then pull handle to stomach while squeezing shoulder blades.",
        "Beginner",
        {
            "beginner": {"male": "70-100 lbs", "female": "40-70 lbs"},
            "intermediate": {"male": "110-150 lbs", "female": "70-100 lbs"},
            "advanced": {"male": "160+ lbs", "female": "110+ lbs"}
        },
        PROGRESSION_TYPES["weight"]
    ),
]

LEGS_EXERCISES = [
    create_exercise(
        "Squat",
        "Compound lower body exercise",
        CATEGORIES["compound"],
        EQUIPMENT["barbell"],
        MUSCLE_GROUPS["legs"],
        [SECONDARY_MUSCLE_GROUPS["quadriceps"], SECONDARY_MUSCLE_GROUPS["hamstrings"], SECONDARY_MUSCLE_GROUPS["glutes"]],
        "Place barbell across upper back. Stand with feet shoulder-width apart. Bend knees and hips to lower body until thighs are parallel to floor. Drive through heels to stand.",
        "Intermediate",
        {
            "beginner": {"male": "95-135 lbs", "female": "45-65 lbs"},
            "intermediate": {"male": "185-275 lbs", "female": "95-135 lbs"},
            "advanced": {"male": "315+ lbs", "female": "155+ lbs"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Romanian Deadlift",
        "Hamstring and glute focused exercise",
        CATEGORIES["compound"],
        EQUIPMENT["barbell"],
        MUSCLE_GROUPS["legs"],
        [SECONDARY_MUSCLE_GROUPS["hamstrings"], SECONDARY_MUSCLE_GROUPS["glutes"], SECONDARY_MUSCLE_GROUPS["lower_back"]],
        "Hold barbell at hip level. With slight knee bend, hinge at hips and lower barbell along legs until feeling hamstring stretch. Return to standing by driving hips forward.",
        "Intermediate",
        {
            "beginner": {"male": "65-95 lbs", "female": "45-65 lbs"},
            "intermediate": {"male": "135-185 lbs", "female": "65-95 lbs"},
            "advanced": {"male": "225+ lbs", "female": "135+ lbs"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Leg Press",
        "Machine compound exercise for lower body",
        CATEGORIES["compound"],
        EQUIPMENT["machine"],
        MUSCLE_GROUPS["legs"],
        [SECONDARY_MUSCLE_GROUPS["quadriceps"], SECONDARY_MUSCLE_GROUPS["glutes"]],
        "Sit on leg press machine with feet shoulder-width on platform. Release safety and lower platform by bending knees until they approach chest. Push platform away until legs are extended.",
        "Beginner",
        {
            "beginner": {"male": "90-180 lbs", "female": "45-90 lbs"},
            "intermediate": {"male": "270-450 lbs", "female": "135-225 lbs"},
            "advanced": {"male": "540+ lbs", "female": "315+ lbs"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Lunge",
        "Unilateral lower body exercise",
        CATEGORIES["compound"],
        EQUIPMENT["bodyweight"],
        MUSCLE_GROUPS["legs"],
        [SECONDARY_MUSCLE_GROUPS["quadriceps"], SECONDARY_MUSCLE_GROUPS["glutes"], SECONDARY_MUSCLE_GROUPS["hamstrings"]],
        "Stand upright. Step forward with one leg and lower body until both knees are bent at 90 degrees. Push through front foot to return to standing position.",
        "Beginner",
        {
            "beginner": "Bodyweight",
            "intermediate": {"male": "20-40 lbs (dumbbells)", "female": "10-25 lbs (dumbbells)"},
            "advanced": {"male": "50+ lbs (dumbbells or barbell)", "female": "30+ lbs (dumbbells or barbell)"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Calf Raise",
        "Isolation exercise for calves",
        CATEGORIES["isolation"],
        EQUIPMENT["machine"],
        MUSCLE_GROUPS["legs"],
        [SECONDARY_MUSCLE_GROUPS["calves"]],
        "Stand on calf raise machine with balls of feet on platform. Lower heels below platform level, then raise by pushing through balls of feet until standing on toes.",
        "Beginner",
        {
            "beginner": {"male": "90-135 lbs", "female": "45-90 lbs"},
            "intermediate": {"male": "180-270 lbs", "female": "90-135 lbs"},
            "advanced": {"male": "315+ lbs", "female": "180+ lbs"}
        },
        PROGRESSION_TYPES["weight"]
    ),
]

SHOULDERS_EXERCISES = [
    create_exercise(
        "Overhead Press",
        "Compound shoulder exercise",
        CATEGORIES["compound"],
        EQUIPMENT["barbell"],
        MUSCLE_GROUPS["shoulders"],
        [SECONDARY_MUSCLE_GROUPS["triceps"], SECONDARY_MUSCLE_GROUPS["front_delts"], SECONDARY_MUSCLE_GROUPS["side_delts"]],
        "Stand with feet shoulder-width apart. Hold barbell at shoulder level with overhand grip. Press bar overhead until arms are fully extended. Lower back to shoulders with control.",
        "Intermediate",
        {
            "beginner": {"male": "45-65 lbs", "female": "30-45 lbs"},
            "intermediate": {"male": "95-135 lbs", "female": "45-65 lbs"},
            "advanced": {"male": "155+ lbs", "female": "75+ lbs"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Lateral Raise",
        "Isolation exercise for side deltoids",
        CATEGORIES["isolation"],
        EQUIPMENT["dumbbell"],
        MUSCLE_GROUPS["shoulders"],
        [SECONDARY_MUSCLE_GROUPS["side_delts"]],
        "Stand with dumbbells at sides, palms facing in. Raise arms out to sides until parallel to floor, maintaining slight bend in elbows. Lower with control.",
        "Beginner",
        {
            "beginner": {"male": "5-10 lbs each", "female": "2-5 lbs each"},
            "intermediate": {"male": "15-20 lbs each", "female": "7-12 lbs each"},
            "advanced": {"male": "25+ lbs each", "female": "15+ lbs each"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Front Raise",
        "Isolation exercise for front deltoids",
        CATEGORIES["isolation"],
        EQUIPMENT["dumbbell"],
        MUSCLE_GROUPS["shoulders"],
        [SECONDARY_MUSCLE_GROUPS["front_delts"]],
        "Stand with dumbbells in front of thighs, palms facing back. Raise one or both arms forward until parallel to floor. Lower with control.",
        "Beginner",
        {
            "beginner": {"male": "5-10 lbs each", "female": "2-5 lbs each"},
            "intermediate": {"male": "15-20 lbs each", "female": "7-12 lbs each"},
            "advanced": {"male": "25+ lbs each", "female": "15+ lbs each"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Face Pull",
        "Upper back and rear deltoid exercise",
        CATEGORIES["isolation"],
        EQUIPMENT["cable"],
        MUSCLE_GROUPS["shoulders"],
        [SECONDARY_MUSCLE_GROUPS["rear_delts"], SECONDARY_MUSCLE_GROUPS["traps"]],
        "Set cable pulley to head height. Grasp rope attachment with both hands. Pull rope toward face, separating ends as you pull and externally rotating shoulders.",
        "Beginner",
        {
            "beginner": {"male": "20-30 lbs", "female": "10-20 lbs"},
            "intermediate": {"male": "35-50 lbs", "female": "20-35 lbs"},
            "advanced": {"male": "55+ lbs", "female": "40+ lbs"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Arnold Press",
        "Comprehensive shoulder exercise",
        CATEGORIES["compound"],
        EQUIPMENT["dumbbell"],
        MUSCLE_GROUPS["shoulders"],
        [SECONDARY_MUSCLE_GROUPS["front_delts"], SECONDARY_MUSCLE_GROUPS["side_delts"], SECONDARY_MUSCLE_GROUPS["triceps"]],
        "Sit with dumbbells at shoulder height, palms facing you. As you press up, rotate wrists so palms face forward at top. Reverse motion on way down.",
        "Intermediate",
        {
            "beginner": {"male": "15-25 lbs each", "female": "5-15 lbs each"},
            "intermediate": {"male": "30-45 lbs each", "female": "15-25 lbs each"},
            "advanced": {"male": "50+ lbs each", "female": "30+ lbs each"}
        },
        PROGRESSION_TYPES["weight"]
    ),
]

ARMS_EXERCISES = [
    create_exercise(
        "Bicep Curl",
        "Isolation exercise for biceps",
        CATEGORIES["isolation"],
        EQUIPMENT["dumbbell"],
        MUSCLE_GROUPS["arms"],
        [SECONDARY_MUSCLE_GROUPS["biceps"], SECONDARY_MUSCLE_GROUPS["forearms"]],
        "Stand with dumbbells at sides, palms facing forward. Bend elbows to curl weights toward shoulders. Lower with control.",
        "Beginner",
        {
            "beginner": {"male": "10-20 lbs each", "female": "5-10 lbs each"},
            "intermediate": {"male": "25-35 lbs each", "female": "12-20 lbs each"},
            "advanced": {"male": "40+ lbs each", "female": "25+ lbs each"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Tricep Pushdown",
        "Isolation exercise for triceps",
        CATEGORIES["isolation"],
        EQUIPMENT["cable"],
        MUSCLE_GROUPS["arms"],
        [SECONDARY_MUSCLE_GROUPS["triceps"]],
        "Stand facing cable machine with high pulley. Grasp bar with overhand grip. Keeping elbows at sides, extend arms downward until straight. Return with control.",
        "Beginner",
        {
            "beginner": {"male": "30-50 lbs", "female": "15-30 lbs"},
            "intermediate": {"male": "60-80 lbs", "female": "30-50 lbs"},
            "advanced": {"male": "90+ lbs", "female": "60+ lbs"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Hammer Curl",
        "Bicep and forearm exercise",
        CATEGORIES["isolation"],
        EQUIPMENT["dumbbell"],
        MUSCLE_GROUPS["arms"],
        [SECONDARY_MUSCLE_GROUPS["biceps"], SECONDARY_MUSCLE_GROUPS["forearms"]],
        "Stand with dumbbells at sides, palms facing in. Bend elbows to curl weights toward shoulders while maintaining neutral grip. Lower with control.",
        "Beginner",
        {
            "beginner": {"male": "10-20 lbs each", "female": "5-10 lbs each"},
            "intermediate": {"male": "25-35 lbs each", "female": "12-20 lbs each"},
            "advanced": {"male": "40+ lbs each", "female": "25+ lbs each"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Skull Crusher",
        "Isolation exercise for triceps",
        CATEGORIES["isolation"],
        EQUIPMENT["barbell"],
        MUSCLE_GROUPS["arms"],
        [SECONDARY_MUSCLE_GROUPS["triceps"]],
        "Lie on bench with barbell held above chest, arms extended. Bend elbows to lower bar toward forehead, keeping upper arms stationary. Extend arms to return to start.",
        "Intermediate",
        {
            "beginner": {"male": "30-40 lbs", "female": "15-25 lbs"},
            "intermediate": {"male": "45-65 lbs", "female": "25-35 lbs"},
            "advanced": {"male": "70+ lbs", "female": "40+ lbs"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Dips",
        "Compound exercise for triceps",
        CATEGORIES["compound"],
        EQUIPMENT["bodyweight"],
        MUSCLE_GROUPS["arms"],
        [SECONDARY_MUSCLE_GROUPS["triceps"], SECONDARY_MUSCLE_GROUPS["pecs"], SECONDARY_MUSCLE_GROUPS["front_delts"]],
        "Mount parallel bars with arms straight. Keep body upright for tricep focus. Bend elbows to lower body until upper arms are parallel to floor. Push back up to starting position.",
        "Intermediate",
        {
            "beginner": "Assisted with band or machine",
            "intermediate": "Bodyweight",
            "advanced": "Weighted with belt (10-45+ lbs)"
        },
        PROGRESSION_TYPES["weight"]
    ),
]

CORE_EXERCISES = [
    create_exercise(
        "Plank",
        "Isometric core exercise",
        CATEGORIES["isolation"],
        EQUIPMENT["bodyweight"],
        MUSCLE_GROUPS["core"],
        [SECONDARY_MUSCLE_GROUPS["abs"], SECONDARY_MUSCLE_GROUPS["lower_back"]],
        "Start in push-up position but with forearms on floor. Keep body in straight line from head to heels, engaging core. Hold position.",
        "Beginner",
        {
            "beginner": "30-60 seconds",
            "intermediate": "1-2 minutes",
            "advanced": "3+ minutes or weighted"
        },
        PROGRESSION_TYPES["time"]
    ),
    create_exercise(
        "Crunch",
        "Basic abdominal exercise",
        CATEGORIES["isolation"],
        EQUIPMENT["bodyweight"],
        MUSCLE_GROUPS["core"],
        [SECONDARY_MUSCLE_GROUPS["abs"]],
        "Lie on back with knees bent, feet flat on floor. Place hands behind or beside head. Contract abs to lift shoulders off floor, then lower with control.",
        "Beginner",
        {
            "beginner": "10-15 reps",
            "intermediate": "15-25 reps",
            "advanced": "25+ reps or weighted"
        },
        PROGRESSION_TYPES["reps"]
    ),
    create_exercise(
        "Russian Twist",
        "Rotational core exercise",
        CATEGORIES["isolation"],
        EQUIPMENT["bodyweight"],
        MUSCLE_GROUPS["core"],
        [SECONDARY_MUSCLE_GROUPS["abs"], SECONDARY_MUSCLE_GROUPS["obliques"]],
        "Sit on floor with knees bent, feet elevated. Lean back slightly, keeping back straight. Rotate torso to touch floor on each side alternately.",
        "Beginner",
        {
            "beginner": "Bodyweight",
            "intermediate": {"male": "5-10 lb weight", "female": "3-8 lb weight"},
            "advanced": {"male": "15+ lb weight", "female": "10+ lb weight"}
        },
        PROGRESSION_TYPES["weight"]
    ),
    create_exercise(
        "Leg Raise",
        "Lower abdominal exercise",
        CATEGORIES["isolation"],
        EQUIPMENT["bodyweight"],
        MUSCLE_GROUPS["core"],
        [SECONDARY_MUSCLE_GROUPS["abs"], SECONDARY_MUSCLE_GROUPS["hip_flexors"]],
        "Lie flat on back with hands at sides or under lower back. Keeping legs straight, raise them until perpendicular to floor. Lower with control.",
        "Intermediate",
        {
            "beginner": "Bent knees",
            "intermediate": "Straight legs",
            "advanced": "Weighted or hanging from bar"
        },
        PROGRESSION_TYPES["difficulty"]
    ),
    create_exercise(
        "Mountain Climber",
        "Dynamic core exercise",
        CATEGORIES["compound"],
        EQUIPMENT["bodyweight"],
        MUSCLE_GROUPS["core"],
        [SECONDARY_MUSCLE_GROUPS["abs"], SECONDARY_MUSCLE_GROUPS["hip_flexors"], SECONDARY_MUSCLE_GROUPS["shoulders"]],
        "Start in push-up position. Rapidly alternate bringing knees toward chest, as if running in place with hands on floor.",
        "Beginner",
        {
            "beginner": "30-45 seconds",
            "intermediate": "45-60 seconds",
            "advanced": "60+ seconds"
        },
        PROGRESSION_TYPES["time"]
    ),
]

# Combine all exercises
EXERCISE_LIBRARY = (
    CHEST_EXERCISES + 
    BACK_EXERCISES + 
    LEGS_EXERCISES + 
    SHOULDERS_EXERCISES + 
    ARMS_EXERCISES + 
    CORE_EXERCISES
)

# SAMPLE WORKOUT PLANS

# Plan A: General Fitness (3 days per week)
GENERAL_FITNESS_PLAN = {
    "name": "General Fitness Plan",
    "description": "A balanced approach to fitness focusing on all major muscle groups",
    "days_per_week": 3,
    "duration_weeks": 8,
    "workouts": [
        {
            "name": "Workout A - Full Body",
            "exercises": [
                {"exercise_name": "Bench Press", "sets": 3, "reps": "8-10", "rest_seconds": 90},
                {"exercise_name": "Squat", "sets": 3, "reps": "8-10", "rest_seconds": 120},
                {"exercise_name": "Bent Over Row", "sets": 3, "reps": "8-10", "rest_seconds": 90},
                {"exercise_name": "Overhead Press", "sets": 3, "reps": "8-10", "rest_seconds": 90},
                {"exercise_name": "Plank", "sets": 3, "reps": "30-60 seconds", "rest_seconds": 60},
            ]
        },
        {
            "name": "Workout B - Upper Body Focus",
            "exercises": [
                {"exercise_name": "Incline Bench Press", "sets": 3, "reps": "8-10", "rest_seconds": 90},
                {"exercise_name": "Pull-up", "sets": 3, "reps": "As many as possible", "rest_seconds": 120},
                {"exercise_name": "Lateral Raise", "sets": 3, "reps": "10-12", "rest_seconds": 60},
                {"exercise_name": "Bicep Curl", "sets": 3, "reps": "10-12", "rest_seconds": 60},
                {"exercise_name": "Tricep Pushdown", "sets": 3, "reps": "10-12", "rest_seconds": 60},
            ]
        },
        {
            "name": "Workout C - Lower Body Focus",
            "exercises": [
                {"exercise_name": "Deadlift", "sets": 3, "reps": "6-8", "rest_seconds": 120},
                {"exercise_name": "Leg Press", "sets": 3, "reps": "10-12", "rest_seconds": 90},
                {"exercise_name": "Lunge", "sets": 3, "reps": "10 each leg", "rest_seconds": 90},
                {"exercise_name": "Calf Raise", "sets": 3, "reps": "15-20", "rest_seconds": 60},
                {"exercise_name": "Russian Twist", "sets": 3, "reps": "15 each side", "rest_seconds": 60},
            ]
        }
    ]
}

# Plan B: Muscle Hypertrophy (3 days per week)
HYPERTROPHY_PLAN = {
    "name": "Muscle Hypertrophy Plan",
    "description": "Focused on muscle growth with higher volume training",
    "days_per_week": 3,
    "duration_weeks": 12,
    "workouts": [
        {
            "name": "Workout A - Push (Chest, Shoulders, Triceps)",
            "exercises": [
                {"exercise_name": "Bench Press", "sets": 4, "reps": "8-12", "rest_seconds": 90},
                {"exercise_name": "Incline Bench Press", "sets": 4, "reps": "8-12", "rest_seconds": 90},
                {"exercise_name": "Overhead Press", "sets": 3, "reps": "8-12", "rest_seconds": 90},
                {"exercise_name": "Lateral Raise", "sets": 3, "reps": "12-15", "rest_seconds": 60},
                {"exercise_name": "Tricep Pushdown", "sets": 3, "reps": "12-15", "rest_seconds": 60},
                {"exercise_name": "Skull Crusher", "sets": 3, "reps": "12-15", "rest_seconds": 60},
            ]
        },
        {
            "name": "Workout B - Pull (Back, Biceps)",
            "exercises": [
                {"exercise_name": "Deadlift", "sets": 3, "reps": "6-8", "rest_seconds": 120},
                {"exercise_name": "Pull-up", "sets": 4, "reps": "As many as possible", "rest_seconds": 90},
                {"exercise_name": "Bent Over Row", "sets": 4, "reps": "8-12", "rest_seconds": 90},
                {"exercise_name": "Face Pull", "sets": 3, "reps": "12-15", "rest_seconds": 60},
                {"exercise_name": "Bicep Curl", "sets": 3, "reps": "12-15", "rest_seconds": 60},
                {"exercise_name": "Hammer Curl", "sets": 3, "reps": "12-15", "rest_seconds": 60},
            ]
        },
        {
            "name": "Workout C - Legs and Core",
            "exercises": [
                {"exercise_name": "Squat", "sets": 4, "reps": "8-12", "rest_seconds": 120},
                {"exercise_name": "Leg Press", "sets": 4, "reps": "10-15", "rest_seconds": 90},
                {"exercise_name": "Romanian Deadlift", "sets": 3, "reps": "8-12", "rest_seconds": 90},
                {"exercise_name": "Calf Raise", "sets": 4, "reps": "15-20", "rest_seconds": 60},
                {"exercise_name": "Leg Raise", "sets": 3, "reps": "12-15", "rest_seconds": 60},
                {"exercise_name": "Plank", "sets": 3, "reps": "45-60 seconds", "rest_seconds": 60},
            ]
        }
    ]
}

# Plan C: Strength Building (3 days per week)
STRENGTH_PLAN = {
    "name": "Strength Building Plan",
    "description": "Focuses on compound movements for maximum strength gains",
    "days_per_week": 3,
    "duration_weeks": 10,
    "workouts": [
        {
            "name": "Workout A - Squat Focus",
            "exercises": [
                {"exercise_name": "Squat", "sets": 5, "reps": "5", "rest_seconds": 180},
                {"exercise_name": "Bench Press", "sets": 5, "reps": "5", "rest_seconds": 180},
                {"exercise_name": "Bent Over Row", "sets": 3, "reps": "5-8", "rest_seconds": 150},
                {"exercise_name": "Good Morning", "sets": 3, "reps": "8-10", "rest_seconds": 120},
                {"exercise_name": "Plank", "sets": 3, "reps": "60 seconds", "rest_seconds": 60},
            ]
        },
        {
            "name": "Workout B - Bench Focus",
            "exercises": [
                {"exercise_name": "Bench Press", "sets": 5, "reps": "5", "rest_seconds": 180},
                {"exercise_name": "Squat", "sets": 3, "reps": "8", "rest_seconds": 150},
                {"exercise_name": "Pull-up", "sets": 5, "reps": "5", "rest_seconds": 180},
                {"exercise_name": "Overhead Press", "sets": 3, "reps": "8", "rest_seconds": 120},
                {"exercise_name": "Dips", "sets": 3, "reps": "8-10", "rest_seconds": 120},
            ]
        },
        {
            "name": "Workout C - Deadlift Focus",
            "exercises": [
                {"exercise_name": "Deadlift", "sets": 5, "reps": "5", "rest_seconds": 180},
                {"exercise_name": "Overhead Press", "sets": 5, "reps": "5", "rest_seconds": 180},
                {"exercise_name": "Front Squat", "sets": 3, "reps": "8", "rest_seconds": 150},
                {"exercise_name": "Chin-up", "sets": 3, "reps": "8", "rest_seconds": 120},
                {"exercise_name": "Russian Twist", "sets": 3, "reps": "15 each side", "rest_seconds": 60},
            ]
        }
    ]
}

# Function to get all exercises
def get_all_exercises():
    return EXERCISE_LIBRARY

# Function to get exercises by primary muscle group
def get_exercises_by_muscle(muscle_group):
    return [ex for ex in EXERCISE_LIBRARY if ex["primary_muscle_group"] == MUSCLE_GROUPS.get(muscle_group)]

# Function to get exercises by equipment
def get_exercises_by_equipment(equipment_type):
    return [ex for ex in EXERCISE_LIBRARY if ex["equipment"] == EQUIPMENT.get(equipment_type)]

# Function to get all workout plans
def get_all_workout_plans():
    return [GENERAL_FITNESS_PLAN, HYPERTROPHY_PLAN, STRENGTH_PLAN]

# Function to seed the database
def seed_exercises(db_session):
    """
    Populate the database with the exercise library.
    This function would interact with your database models to create records.
    """
    # Implementation would depend on your ORM and models
    pass

def seed_workout_plans(db_session):
    """
    Populate the database with workout plans.
    This function would interact with your database models to create records.
    """
    # Implementation would depend on your ORM and models
    pass

    