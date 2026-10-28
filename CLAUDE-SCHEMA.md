# Medaliq — Schema Cheat-Sheet
# Referencia rápida del schema. Si el campo exacto importa → leer prisma/schema.prisma.
# Actualizar cuando se creen modelos o campos nuevos.

---

## Enums clave

| Enum | Valores |
|------|---------|
| `UserRole` | ATHLETE · COACH · ADMIN |
| `UserStatus` | ACTIVE · SUSPENDED · BLOCKED · DELETED |
| `AthleteStatus` | ACTIVE · PAUSED |
| `GoalType` | RACE_5K · RACE_10K · RACE_HALF_MARATHON · RACE_MARATHON · RACE_TRIATHLON · RACE_CYCLING · RACE_SWIMMING · FOOTBALL_GPP · STRENGTH_TRAINING · BODY_RECOMPOSITION · WEIGHT_LOSS · GENERAL_FITNESS |
| `PlanStatus` | ACTIVE · COMPLETED · PAUSED · ABANDONED |
| `PlanSource` | COACH |
| `Phase` | BASE · DESARROLLO · ESPECIFICO · AFINAMIENTO · COMPETENCIA · RECUPERACION |
| `SessionIntensity` | LOW · MODERATE · HIGH · RACE |
| `SessionType` | RUNNING · GYM · CYCLING · SWIMMING · CROSS · REST · BRICK |
| `SessionDiscipline` | RUNNING · GYM · CYCLING · SWIMMING · TRIATHLON · FOOTBALL · CROSS |
| `SetType` | STRAIGHT · DROPSET · SUPERSET · WARMUP |
| `SetLogType` | REPS · TIME · DISTANCE |
| `MealType` | BREAKFAST · LUNCH · DINNER · SNACK · PRE_WORKOUT · POST_WORKOUT |
| `NutritionDayType` | HARD · EASY · REST |
| `NutritionSource` | MANUAL · BARCODE · PROPOSAL |
| `PostType` | TEXT · IMAGE · VIDEO · LINK |
| `PaymentStatus` | PENDING · COMPLETED · FAILED · REFUNDED |
| `FoodProposalStatus` | PENDING · APPROVED · REJECTED |
| `CoachSpecialty` | RUNNING · GYM · NUTRITION · ALL |
| `SubscriptionTier` | TRIAL · FREE · PRO |
| `CoachSubscriptionTier` | STARTER(≤5) · GROWTH(6-25) · PRO(26-75) · SCALE(+75) |
| `SuggestionStatus` | PENDING · ACCEPTED · DISMISSED |
| `SuggestionType` | INTENSIDAD · VOLUMEN · DESCANSO · NUTRICION · HIDRATACION |
| `CoachProposalStatus` | PENDING · ACCEPTED · REJECTED |
| `AthleteUserType` | B2C · B2B |

---

## Modelos por dominio

### AUTH
```
User           id · email · role(UserRole) · password · emailVerified · timezone · locale · pushToken
               featurePlan/Checkin/Nutrition/Progress/Log/Coach/Gym (Boolean)
               onboardingCompleted · needsRoleSelection · activated · status(UserStatus)
               identification(@unique) · phoneWa(@unique)
               → Account[] · Session[] · HealthProfile · CoachAthlete[]×2 · UserSubscription
Account        userId → User (Cascade) · @@unique[provider, providerAccountId]
Session        sessionToken(@unique) · userId → User
VerificationToken  identifier · token(@unique) · expires
```

### COACH ↔ ATLETA
```
CoachAthlete   coachId · athleteId · status(AthleteStatus) · coachGoal · privateNotes
               @@unique[coachId, athleteId]
InviteCode     code(@unique) · coachId · usedBy? · expiresAt
CoachProfile   coachId(@unique) · slug(@unique) · specialty(CoachSpecialty) · bio · isPublic
CoachProgram   profileId → CoachProfile · name · description · price · durationWeeks
CoachPost      profileId → CoachProfile · type(PostType) · content · mediaUrl
```

### PLAN DE ENTRENAMIENTO
```
TrainingPlan   userId · name · goalType(GoalType?) · totalWeeks · startDate · endDate
               status(PlanStatus) · hrZones(Json) · generatedBy(PlanSource) · nutritionTemplateId?
               → PlanWeek[]
PlanWeek       planId → TrainingPlan · weekNumber · phase(Phase) · volumeKm? · isRecoveryWeek
               @@unique[planId, weekNumber] → PlannedSession[]
PlannedSession weekId → PlanWeek · dayOfWeek · date · type(SessionType) · intensity(SessionIntensity)
               durationMin · notes? · workoutDayId? → SessionTemplate · ← GymSession · ← SessionLog(@unique)
SessionTemplate coachId · name · type · intensity · durationMin · notes
```

### GYM / FUERZA
```
Exercise       coachId? · name · category · muscleGroup · equipment · isGlobal · disciplineId?
WorkoutTemplate  coachId? · athleteId? · name · type · isPublic · → WorkoutDay[]
WorkoutDay     templateId → WorkoutTemplate · name · order → WorkoutExercise[]
WorkoutExercise  dayId · exerciseId · sets · reps · restSeconds · setType(SetType)
AssignedWorkout  templateId · athleteId · coachId? · assignedAt · startDate? · endDate?
GymSession     athleteId · date · assignedWorkoutId? · plannedSessionId?
               @@unique[athleteId, date, assignedWorkoutId]
               @@unique[athleteId, date, plannedSessionId]
               → SetLog[]
SetLog         sessionId → GymSession · workoutExerciseId? · setNumber · reps? · weightKg?
               durationSec? · distanceM? · logType(SetLogType) · rpe?
```

### SESIONES Y LOG
```
SessionLog     userId · date · plannedSessionId(@unique)? · disciplineId? · type · intensity
               durationMin · distanceKm? · avgHr? · maxHr? · calories? · notes? · rpe?
DailyLog       userId · date · energyLevel · sleepHours · stressLevel · notes?
               @@unique[userId, date]
WeeklyRoutine  userId(@unique) · daysPerWeek · preferredDays(Int[]) · sessionDurationMin
WeeklyCheckIn  userId · weekStartDate · weight? · bodyFatPct? · energyAvg · sleepAvg
               adherencePct · notes? · coachFeedback?
PerformanceBenchmark  userId · date · type · value · unit · notes?
```

### NUTRICIÓN
```
HealthProfile  userId(@unique) · age · heightCm · weightKg · weightGoalKg? · gender
               hrResting? · hrMax? · ftp? · sport? · sportGoal? · experienceLevel?
               sessionMinutes? · sportDetails(Json) · dataSources(Json)
NutritionPlan  userId(@unique) · tdee · targetKcal · targetProteinG · targetCarbsG · targetFatG
               targetKcalHard? · targetKcalEasy? · targetKcalRest? (intensidad-based)
FoodProfile    userId(@unique) · diet? · allergies(String[]) · intolerances(String[]) · preferences(String[])
MealPlan       userId(@unique) · → MealPlanVersion[]
Food           name · category · kcalPer100g · proteinPer100g · carbsPer100g · fatPer100g
               source(NutritionSource) · barcode(@unique)?
FoodLog        userId · foodId · date · mealType · grams · kcal · proteinG · carbsG · fatG
               @@unique[userId, foodId, date, mealType]
MealTemplate   userId · name · description? → MealTemplateItem[]
PlannedMeal    userId · date · mealType · foodId · grams · kcal · proteinG · carbsG · fatG
AthleteNutritionOverride  userId · date · targetKcal · targetProteinG · targetCarbsG · targetFatG · reason?
WaterLog       userId · date · amountMl · loggedAt
Recipe         userId · name · servings · instructions? → RecipeIngredient[]
RecipeIngredient  recipeId · foodId · grams
MealPlanVersion   mealPlanId · version · snapshotData(Json) · assignedById?
```

### NUTRICIÓN COACH (templates)
```
NutritionTemplate      coachId? · athleteId? · name · goal?
                       → NutritionTemplateDay[]
NutritionTemplateDay   templateId · dayType(NutritionDayType)
                       @@unique[templateId, dayType] → NutritionTemplateMeal[]
NutritionTemplateMeal  dayId · mealType(MealType)
                       @@unique[dayId, mealType] → NutritionTemplateFoodItem[]
NutritionTemplateFoodItem  mealId · foodId · grams · kcal · proteinG · carbsG · fatG · order
AssignedNutritionPlan  templateId · athleteId(@unique) · coachId · assignedAt
CoachNutritionProposal coachId · athleteId · templateId? · message · status(CoachProposalStatus)
FoodProposal           submittedById · name · category · macros(x100g) · status(FoodProposalStatus)
                       reviewedById? · foodId?(creado al aprobar)
```

### BILLING / SUSCRIPCIONES
```
UserSubscription   userId(@unique) · tier(SubscriptionTier) · coachTier(CoachSubscriptionTier)
                   trialEndsAt? · currentPeriodEnd? · externalCustomerId? · gateway?
                   lastWebhookEventId? (idempotencia Wompi)
Payment            coachId · athleteId? · amount · currency · status(PaymentStatus)
                   externalId? · gateway · description?
PaymentAuditLog    paymentId · actorId · action · previousStatus · newStatus · notes?
```

### INFRAESTRUCTURA / PLATAFORMA
```
SystemConfig       id="singleton" · maintenanceMode · betaMode · allowedEmails(String[])
TierFeatureConfig  tier(SubscriptionTier)(@unique) · features(Json) · limits(Json)
Discipline         slug(@unique) · name · sport · isActive
AdminAuditLog      actorId · targetId? · action · details(Json) · ip?
```

### SOCIAL / NOTIFICACIONES
```
Message        fromId? · toId? · content · readAt?
Notification   userId · type(String) · title · body · read · metadata(Json)?
ActivityStreak userId(@unique) · currentStreak · longestStreak · lastActivityDate
UserAchievement  userId · type · earnedAt · metadata(Json)?
```

### CHECK-IN / SUGERENCIAS
```
WeeklyCheckIn      userId · weekStartDate · weight? · adherencePct · energyAvg · sleepAvg
                   coachFeedback? · → CheckInSuggestion[]
CheckInSuggestion  checkInId · type(SuggestionType) · message · status(SuggestionStatus)
                   coachResponse?
```

### WEARABLES
```
WearableConnection  userId · provider(String) · accessToken(encrypted) · refreshToken?
                    expiresAt? · scopes(String[]) · lastSync?
ProgressPhoto      userId · url · takenAt · notes?
```

---

## Relaciones clave a recordar

```
User (1) → (1) HealthProfile
User (1) → (1) NutritionPlan
User (1) → (1) UserSubscription
User (1) → (1) WeeklyRoutine
User (1) → (*) TrainingPlan        (userId)
User (1) → (*) SessionLog          (userId)
User (1) → (*) FoodLog             (userId)
User (1) → (*) GymSession          (athleteId)
User (N) ↔ (N) User                via CoachAthlete (coachId, athleteId)

TrainingPlan (1) → (*) PlanWeek → (*) PlannedSession
PlannedSession (1) → (1?) SessionLog    (plannedSessionId @unique)
PlannedSession (1) → (1?) GymSession    (plannedSessionId @unique)

WorkoutTemplate (1) → (*) WorkoutDay → (*) WorkoutExercise
AssignedWorkout → WorkoutTemplate → athlete + coach
GymSession → (*) SetLog → WorkoutExercise?

NutritionTemplate → NutritionTemplateDay(HARD/EASY/REST) → NutritionTemplateMeal → NutritionTemplateFoodItem
AssignedNutritionPlan → NutritionTemplate + athlete(@unique) + coach
```

---

## Campos multi-tenant (SIEMPRE filtrar)

- `userId` — en SessionLog, TrainingPlan, DailyLog, FoodLog, NutritionPlan, HealthProfile, etc.
- `athleteId` — en GymSession, AssignedWorkout, AssignedNutritionPlan
- `coachId` — en CoachAthlete, InviteCode, Payment, WorkoutTemplate, Exercise
