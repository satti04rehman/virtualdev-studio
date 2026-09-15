import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'models/project.dart';
import 'models/task.dart';
import 'providers/auth_provider.dart';
import 'providers/project_provider.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/project_detail_screen.dart';
import 'screens/create_project_screen.dart';
import 'screens/approvals_screen.dart';
import 'screens/agent_status_screen.dart';
import 'screens/task_detail_screen.dart';
import 'services/api_service.dart';
import 'services/websocket_service.dart';

const Color kPrimary = Color(0xFF00D4AA);
const Color kSecondary = Color(0xFF7C3AE0);
const Color kBackground = Color(0xFF0F0F23);
const Color kCard = Color(0xFF1A1A2E);

class TaskDetailArgs {
  final String projectId;
  final Task task;
  const TaskDetailArgs({required this.projectId, required this.task});
}

void main() {
  final apiService = ApiService();
  final wsService = WebSocketService();

  runApp(
    MultiProvider(
      providers: [
        Provider<ApiService>.value(value: apiService),
        Provider<WebSocketService>.value(value: wsService),
        ChangeNotifierProvider(create: (_) => AuthProvider(apiService)),
        ChangeNotifierProvider(
          create: (_) => ProjectProvider(apiService, wsService),
        ),
      ],
      child: const VirtualDevApp(),
    ),
  );
}

class VirtualDevApp extends StatelessWidget {
  const VirtualDevApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VirtualDev Studio',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: kBackground,
        colorScheme: ColorScheme.dark(
          primary: kPrimary,
          secondary: kSecondary,
          surface: kCard,
          onPrimary: const Color(0xFF001510),
          onSecondary: Colors.white,
          onSurface: Colors.white,
        ),
        cardTheme: CardTheme(
          color: kCard,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: kBackground,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: kPrimary,
            foregroundColor: const Color(0xFF001510),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 0,
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: kCard,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: kPrimary, width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
      ),
      home: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          if (auth.isAuthenticated) {
            return const DashboardScreen();
          }
          return const LoginScreen();
        },
      ),
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/login':
            return MaterialPageRoute(builder: (_) => const LoginScreen());
          case '/dashboard':
            return MaterialPageRoute(builder: (_) => const DashboardScreen());
          case '/create-project':
            return MaterialPageRoute(builder: (_) => const CreateProjectScreen());
          case '/project-detail':
            final project = settings.arguments as Project;
            return MaterialPageRoute(
              builder: (_) => ProjectDetailScreen(project: project),
            );
          case '/approvals':
            final projectId = settings.arguments as String;
            return MaterialPageRoute(
              builder: (_) => ApprovalsScreen(projectId: projectId),
            );
          case '/agents':
            final projectId = settings.arguments as String;
            return MaterialPageRoute(
              builder: (_) => AgentStatusScreen(projectId: projectId),
            );
          case '/task-detail':
            final args = settings.arguments as TaskDetailArgs;
            return MaterialPageRoute(
              builder: (_) => TaskDetailScreen(
                projectId: args.projectId,
                task: args.task,
              ),
            );
          default:
            return MaterialPageRoute(builder: (_) => const LoginScreen());
        }
      },
    );
  }
}