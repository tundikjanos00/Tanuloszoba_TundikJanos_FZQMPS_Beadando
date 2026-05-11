export type Role = "USER" | "TEACHER" | "ADMIN";

export type User = {
  id: string;
  email: string;
  displayName: string;
  roles: Role[];
  createdAt: string;
};

export type Subject = {
  id: string;
  name: string;
  color: string;
};

export type TeacherProfile = {
  userId: string;
  displayName: string;
  accentColor: string;
  subjectIds: string[];
  visible: boolean;
  user?: User;
};

export type Topic = {
  id: string;
  teacherId: string;
  subjectId: string;
  grade: string;
  semester: string;
  title: string;
  order: number;
  createdAt: string;
};

export type Material = {
  id: string;
  teacherId: string;
  subjectId: string;
  topicId: string;
  grade: string;
  semester: string;
  title: string;
  summary: string;
  body: string;
  links: string[];
  createdAt: string;
  updatedAt: string;
};

